//+------------------------------------------------------------------+
//|                                            DoaIbu_Sync_MT4.mq4   |
//|                        Doa Ibu Trading Journal — EA Sync MT4     |
//|                                      https://doaibujournal.com   |
//+------------------------------------------------------------------+
#property copyright "Doa Ibu Trading Journal"
#property link      "https://doaibujournal.com"
#property version   "17.03"
#property strict

//--- Input Parameters
input string   InpApiUrl          = "https://your-domain.netlify.app/.netlify/functions/sync-trade"; // Webhook Endpoint URL
input string   InpSyncToken       = "";       // Token Sync Akun (Dari Web Jurnal)
input bool     InpAutoBackfill    = true;     // Sinkronkan Riwayat Saat EA Aktif
input int      InpBackfillDays    = 30;       // Jumlah Hari Riwayat Lalu
input int      InpPollIntervalSec = 15;       // Interval Pengecekan (Detik)
input int      InpFilterMagic     = 0;        // Filter Magic Number (0 = Semua)
input bool     InpDebug           = false;    // Tampilkan Log Rinci (Debug)

//--- Global Variables
int      g_syncedTickets[];
int      g_syncedCount = 0;
datetime g_lastCheckTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("======================================================");
   Print("[DoaIbu] Memulai Doa Ibu Sync MT4 v17.03...");
   
   if(StringLen(InpSyncToken) == 0)
   {
      Alert("[DoaIbu ERROR] Token Sync Akun belum diisi!\nSilakan masukkan Token Sync dari Halaman Akun Doa Ibu Journal.");
      Print("[DoaIbu ERROR] InpSyncToken kosong. EA tidak akan mengirim data.");
      return(INIT_PARAMETERS_INCORRECT);
   }

   ArrayResize(g_syncedTickets, 0);
   g_syncedCount = 0;

   // Aktifkan timer berkala
   EventSetTimer(InpPollIntervalSec);
   
   // Backfill riwayat jika diaktifkan
   if(InpAutoBackfill)
   {
      Print("[DoaIbu] Melakukan backfill riwayat trade ", InpBackfillDays, " hari terakhir...");
      ScanAndSyncClosedTrades(InpBackfillDays);
   }

   Print("[DoaIbu] EA aktif. Memonitor transaksi setiap ", InpPollIntervalSec, " detik.");
   Print("======================================================");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[DoaIbu] EA dinonaktifkan (alasan: ", reason, ")");
}

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   ScanAndSyncClosedTrades(InpBackfillDays);
}

//+------------------------------------------------------------------+
//| Trade transaction event function                                 |
//+------------------------------------------------------------------+
void OnTrade()
{
   // Deteksi langsung saat ada trade ditutup
   ScanAndSyncClosedTrades(1);
}

//+------------------------------------------------------------------+
//| Normalisasi nama simbol broker (EURUSD.m, EURUSDpro -> EURUSD)   |
//+------------------------------------------------------------------+
string NormalizeSymbol(string raw)
{
   string s = raw;
   StringToUpper(s);
   
   // Hapus suffix umum broker
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
//| Cek apakah tiket sudah pernah disinkronkan                       |
//+------------------------------------------------------------------+
bool IsTicketSynced(int ticket)
{
   for(int i = 0; i < g_syncedCount; i++)
   {
      if(g_syncedTickets[i] == ticket) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Tambahkan tiket ke daftar terkirim                               |
//+------------------------------------------------------------------+
void MarkTicketSynced(int ticket)
{
   if(IsTicketSynced(ticket)) return;
   g_syncedCount++;
   ArrayResize(g_syncedTickets, g_syncedCount);
   g_syncedTickets[g_syncedCount - 1] = ticket;
}

//+------------------------------------------------------------------+
//| Pindai dan kirim trade tertutup ke Jurnal                        |
//+------------------------------------------------------------------+
void ScanAndSyncClosedTrades(int daysLookback)
{
   datetime cutoff = TimeCurrent() - (daysLookback * 86400);
   int totalHistory = OrdersHistoryTotal();
   string jsonTrades = "";
   int sendCount = 0;
   
   int pendingTickets[];
   ArrayResize(pendingTickets, 0);

   for(int i = totalHistory - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      
      int type = OrderType();
      // Hanya kirim order BUY (0) atau SELL (1)
      if(type != OP_BUY && type != OP_SELL) continue;
      
      int ticket = OrderTicket();
      if(IsTicketSynced(ticket)) continue;
      
      datetime closeTime = OrderCloseTime();
      if(closeTime < cutoff) continue;
      
      if(InpFilterMagic > 0 && OrderMagicNumber() != InpFilterMagic) continue;

      string sym = NormalizeSymbol(OrderSymbol());
      string side = (type == OP_BUY) ? "BUY" : "SELL";
      double lots = OrderLots();
      double openPrice = OrderOpenPrice();
      double closePrice = OrderClosePrice();
      double sl = OrderStopLoss();
      double tp = OrderTakeProfit();
      datetime openTime = OrderOpenTime();
      double profit = OrderProfit();
      double commission = OrderCommission();
      double swap = OrderSwap();
      string comment = OrderComment();

      string tradeObj = StringFormat(
         "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,\"closePrice\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"openTime\":%d,\"closeTime\":%d,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"comment\":\"%s\"}",
         ticket, sym, side, lots, openPrice, closePrice, sl, tp, (int)openTime, (int)closeTime, profit, commission, swap, comment
      );

      if(sendCount > 0) jsonTrades += ",";
      jsonTrades += tradeObj;
      sendCount++;

      ArrayResize(pendingTickets, sendCount);
      pendingTickets[sendCount - 1] = ticket;

      // Batch maksimal 50 trade per request agar payload tidak terlalu besar
      if(sendCount >= 50) break;
   }

   if(sendCount == 0) return;

   // Bangun JSON payload
   string payload = StringFormat(
      "{\"token\":\"%s\",\"terminal\":\"MT4\",\"accountNumber\":%d,\"broker\":\"%s\",\"trades\":[%s]}",
      InpSyncToken, AccountNumber(), AccountCompany(), jsonTrades
   );

   if(InpDebug)
   {
      Print("[DoaIbu DEBUG] Mengirim ", sendCount, " trade ke endpoint...");
   }

   // Kirim via WebRequest
   char postData[];
   char resultData[];
   string resultHeaders;
   StringToCharArray(payload, postData, 0, StringLen(payload));
   
   string headers = "Content-Type: application/json\r\nUser-Agent: DoaIbu_Sync_MT4/17.03\r\n";
   ResetLastError();

   int res = WebRequest("POST", InpApiUrl, headers, 10000, postData, resultData, resultHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4060)
      {
         Alert("[DoaIbu ERROR 4060]\nURL belum diizinkan di MetaTrader!\n\nBuka Menu: Tools -> Options -> Expert Advisors\nCentang: 'Allow WebRequest for listed URL'\nTambahkan URL:\n" + InpApiUrl);
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
      // Tandai semua tiket yang berhasil terkirim
      for(int k = 0; k < sendCount; k++)
      {
         MarkTicketSynced(pendingTickets[k]);
      }
      Print("[DoaIbu SUCCESS] Berhasil menyinkronkan ", sendCount, " trade ke Doa Ibu Journal!");
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
