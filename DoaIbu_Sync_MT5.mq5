//+------------------------------------------------------------------+
//|                                            DoaIbu_Sync_MT5.mq5   |
//|                        Doa Ibu Trading Journal — EA Sync MT5     |
//|                                      https://doaibujournal.com   |
//+------------------------------------------------------------------+
#property copyright "Doa Ibu Trading Journal"
#property link      "https://doaibujournal.com"
#property version   "17.03"

//--- Input Parameters
input string   InpApiUrl          = "https://your-domain.netlify.app/.netlify/functions/sync-trade"; // Webhook Endpoint URL
input string   InpSyncToken       = "";       // Token Sync Akun (Dari Web Jurnal)
input bool     InpAutoBackfill    = true;     // Sinkronkan Riwayat Saat EA Aktif
input int      InpBackfillDays    = 30;       // Jumlah Hari Riwayat Lalu
input int      InpPollIntervalSec = 15;       // Interval Pengecekan (Detik)
input ulong    InpFilterMagic     = 0;        // Filter Magic Number (0 = Semua)
input bool     InpDebug           = false;    // Tampilkan Log Rinci (Debug)

//--- Global Variables
ulong    g_syncedDeals[];
int      g_syncedCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("======================================================");
   Print("[DoaIbu] Memulai Doa Ibu Sync MT5 v17.03...");

   if(StringLen(InpSyncToken) == 0)
   {
      Alert("[DoaIbu ERROR] Token Sync Akun belum diisi!\nSilakan masukkan Token Sync dari Halaman Akun Doa Ibu Journal.");
      Print("[DoaIbu ERROR] InpSyncToken kosong. EA tidak akan mengirim data.");
      return(INIT_PARAMETERS_INCORRECT);
   }

   ArrayResize(g_syncedDeals, 0);
   g_syncedCount = 0;

   // Aktifkan timer berkala
   EventSetTimer(InpPollIntervalSec);

   // Backfill riwayat jika diaktifkan
   if(InpAutoBackfill)
   {
      Print("[DoaIbu] Melakukan backfill riwayat deal MT5 ", InpBackfillDays, " hari terakhir...");
      ScanAndSyncClosedDeals(InpBackfillDays);
   }

   Print("[DoaIbu] EA MT5 aktif. Memonitor transaksi setiap ", InpPollIntervalSec, " detik.");
   Print("======================================================");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[DoaIbu] EA MT5 dinonaktifkan (alasan: ", reason, ")");
}

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   ScanAndSyncClosedDeals(InpBackfillDays);
}

//+------------------------------------------------------------------+
//| Trade Transaction event                                          |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   // Deteksi langsung saat deal penutupan terjadi
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ScanAndSyncClosedDeals(1);
   }
}

//+------------------------------------------------------------------+
//| Normalisasi nama simbol broker                                   |
//+------------------------------------------------------------------+
string NormalizeSymbol(string raw)
{
   string s = raw;
   StringToUpper(s);

   string suffixes[] = {".M", ".PRO", ".ECN", ".MICRO", ".RAW", ".STD", "_SB", "_I", "M", "PRO"};
   int total = ArraySize(suffixes);
   for(int i = 0; i < total; i++)
   {
      int pos = StringFind(s, suffixes[i]);
      if(pos > 2)
      {
         s = StringSubstr(s, 0, pos);
         break;
      }
   }
   return s;
}

//+------------------------------------------------------------------+
//| Cek apakah deal sudah pernah disinkronkan                        |
//+------------------------------------------------------------------+
bool IsDealSynced(ulong ticket)
{
   for(int i = 0; i < g_syncedCount; i++)
   {
      if(g_syncedDeals[i] == ticket) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Tandai deal telah terkirim                                       |
//+------------------------------------------------------------------+
void MarkDealSynced(ulong ticket)
{
   if(IsDealSynced(ticket)) return;
   g_syncedCount++;
   ArrayResize(g_syncedDeals, g_syncedCount);
   g_syncedDeals[g_syncedCount - 1] = ticket;
}

//+------------------------------------------------------------------+
//| Pindai deal penutupan (DEAL_ENTRY_OUT) dan kirim ke Jurnal       |
//+------------------------------------------------------------------+
void ScanAndSyncClosedDeals(int daysLookback)
{
   datetime toTime = TimeCurrent();
   datetime fromTime = toTime - (daysLookback * 86400);

   if(!HistorySelect(fromTime, toTime))
   {
      if(InpDebug) Print("[DoaIbu DEBUG] Gagal memuat HistorySelect MT5");
      return;
   }

   int totalDeals = HistoryDealsTotal();
   string jsonTrades = "";
   int sendCount = 0;

   ulong pendingDeals[];
   ArrayResize(pendingDeals, 0);

   for(int i = totalDeals - 1; i >= 0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      // Hanya ambil deal penutupan (DEAL_ENTRY_OUT atau DEAL_ENTRY_INOUT)
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) continue;

      if(IsDealSynced(ticket)) continue;

      ulong magic = (ulong)HistoryDealGetInteger(ticket, DEAL_MAGIC);
      if(InpFilterMagic > 0 && magic != InpFilterMagic) continue;

      string sym = NormalizeSymbol(HistoryDealGetString(ticket, DEAL_SYMBOL));
      long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);

      // Pada MT5, deal penutupan DEAL_TYPE_SELL berarti posisi aslinya adalah BUY (Long),
      // dan sebaliknya penutupan DEAL_TYPE_BUY berarti posisi aslinya SELL (Short).
      string side = "BUY";
      if(dealType == DEAL_TYPE_BUY)
      {
         side = "SELL";
      }
      else if(dealType == DEAL_TYPE_SELL)
      {
         side = "BUY";
      }
      else
      {
         continue; // Abaikan deal balance/credit
      }

      double lots = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
      datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
      string comment = HistoryDealGetString(ticket, DEAL_COMMENT);
      ulong posId = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

      // Cari harga entry dari deal pembukaan terkait posisi ini
      double openPrice = closePrice;
      datetime openTime = closeTime;
      double sl = 0.0;
      double tp = 0.0;

      if(HistorySelectByPosition(posId))
      {
         int posDeals = HistoryDealsTotal();
         for(int p = 0; p < posDeals; p++)
         {
            ulong inTicket = HistoryDealGetTicket(p);
            if(inTicket != 0 && HistoryDealGetInteger(inTicket, DEAL_ENTRY) == DEAL_ENTRY_IN)
            {
               openPrice = HistoryDealGetDouble(inTicket, DEAL_PRICE);
               openTime = (datetime)HistoryDealGetInteger(inTicket, DEAL_TIME);
               break;
            }
         }
      }

      string tradeObj = StringFormat(
         "{\"ticket\":%I64u,\"positionId\":%I64u,\"symbol\":\"%s\",\"type\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,\"closePrice\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"openTime\":%d,\"closeTime\":%d,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"comment\":\"%s\"}",
         ticket, posId, sym, side, lots, openPrice, closePrice, sl, tp, (int)openTime, (int)closeTime, profit, commission, swap, comment
      );

      if(sendCount > 0) jsonTrades += ",";
      jsonTrades += tradeObj;
      sendCount++;

      ArrayResize(pendingDeals, sendCount);
      pendingDeals[sendCount - 1] = ticket;

      // Batasi 50 deal per batch
      if(sendCount >= 50) break;
   }

   if(sendCount == 0) return;

   // Bangun JSON payload
   string payload = StringFormat(
      "{\"token\":\"%s\",\"terminal\":\"MT5\",\"accountNumber\":%I64d,\"broker\":\"%s\",\"trades\":[%s]}",
      InpSyncToken, AccountInfoInteger(ACCOUNT_LOGIN), AccountInfoString(ACCOUNT_COMPANY), jsonTrades
   );

   if(InpDebug) Print("[DoaIbu DEBUG] Mengirim ", sendCount, " deal MT5 ke endpoint...");

   // Kirim WebRequest
   char postData[];
   char resultData[];
   string resultHeaders;
   StringToCharArray(payload, postData, 0, StringLen(payload));

   string headers = "Content-Type: application/json\r\nUser-Agent: DoaIbu_Sync_MT5/17.03\r\n";
   ResetLastError();

   int res = WebRequest("POST", InpApiUrl, headers, 10000, postData, resultData, resultHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4060)
      {
         Alert("[DoaIbu ERROR 4060]\nURL belum diizinkan di MetaTrader 5!\n\nBuka Menu: Tools -> Options -> Expert Advisors\nCentang: 'Allow WebRequest for listed URL'\nTambahkan URL:\n" + InpApiUrl);
         Print("[DoaIbu ERROR] WebRequest tidak diizinkan. Tambahkan " + InpApiUrl + " di Tools -> Options -> Expert Advisors");
      }
      else
      {
         Print("[DoaIbu ERROR] WebRequest gagal. Error code: ", err);
      }
      return;
   }

   string response = CharArrayToString(resultData);
   if(InpDebug) Print("[DoaIbu DEBUG] Respons server (HTTP ", res, "): ", response);

   if(res == 200 || res == 201)
   {
      for(int k = 0; k < sendCount; k++)
      {
         MarkDealSynced(pendingDeals[k]);
      }
      Print("[DoaIbu SUCCESS] Berhasil menyinkronkan ", sendCount, " deal MT5 ke Doa Ibu Journal!");
   }
   else if(res == 401 || res == 403)
   {
      Alert("[DoaIbu ERROR]\nToken Sync tidak valid atau sudah dicabut!\nPeriksa kembali Token Sync di Halaman Akun Doa Ibu Journal.");
      Print("[DoaIbu ERROR] Autentikasi ditolak (HTTP ", res, "): ", response);
   }
   else
   {
      Print("[DoaIbu WARN] Server merespons HTTP ", res, ": ", response);
   }
}
//+------------------------------------------------------------------+
