# v16.38 — Strategy vs Execution
- Panel baru di Strategy Playbook: membandingkan rule strategi dengan pelaksanaan di journal. Menampilkan sampel layak, hari patuh, total R, expectancy/trade, perbandingan patuh vs melanggar, matriks keputusan x hasil (patuh/melanggar x menang/rugi), rule wajib yang paling sering terlewat, dan ringkasan per strategy. Filter Semua / 90 / 30 hari.
- Sampel layak = journal dengan satu strategy, checklist terisi, dan R tercatat. Yang dikeluarkan dihitung per alasan. Angka hanya tampil bila sampel cukup (>= 5 hari per kelompok, >= 10 trade untuk expectancy).
- Patuh = semua rule wajib tercentang (bila tak ada rule wajib: kepatuhan >= target strategy). Menang = R > 0.
- Tombol Ekspor JSON dan Ekspor CSV untuk seluruh journal + strategy.
- `scripts/strategy_vs_execution.py`: laporan yang sama secara offline dari file ekspor JSON.
- File baru: `strategy-execution.js`, `scripts/strategy_vs_execution.py`, `tests/se-test.js`, `tests/se-app-test.js`. Berubah: `strategy-library.js` (1 baris), `index.html` (1 script), `sw.js` (cache v16-38-strategy-exec).
