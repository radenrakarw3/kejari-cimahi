const { neon } = require("@neondatabase/serverless");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const entries = [
  {
    title: "Jam layanan publik kejaksaan",
    tags: "jam layanan, ptsp, hari kerja, pelayanan publik",
    content:
      "Sebagai acuan umum, pelayanan publik di Kejaksaan Negeri biasanya berlangsung pada hari kerja Senin sampai Jumat sekitar pukul 08.00 sampai 16.00 WIB. Untuk kepastian, warga tetap perlu diarahkan mengecek PTSP, website resmi, atau kontak Kejaksaan Negeri setempat karena jam layanan dapat menyesuaikan kebijakan daerah, cuti bersama, atau hari libur nasional.",
  },
  {
    title: "Biaya layanan hukum dan layanan publik kejaksaan",
    tags: "biaya, gratis, pelayanan hukum, layanan publik",
    content:
      "Pelayanan hukum pada prinsipnya tidak dipungut biaya. Layanan publik seperti konsultasi hukum dan pengurusan pelayanan umum kejaksaan juga harus dijelaskan sebagai layanan resmi tanpa pungutan biaya. Jika warga ragu, arahkan untuk menggunakan kanal resmi Kejaksaan dan tidak memberikan pembayaran di luar mekanisme yang sah.",
  },
  {
    title: "Cara menyampaikan pengaduan masyarakat ke kejaksaan",
    tags: "pengaduan masyarakat, kanal laporan, ptsp, website resmi",
    content:
      "Warga dapat menyampaikan laporan atau pengaduan masyarakat melalui PTSP Kejaksaan Negeri setempat, website resmi, kanal pengaduan online, atau media sosial resmi yang disediakan satuan kerja. Jika warga bingung harus mulai dari mana, arahkan ke kanal resmi yang paling mudah dijangkau dan tekankan agar data yang disampaikan ditulis jelas, ringkas, dan dapat dipertanggungjawabkan.",
  },
  {
    title: "Syarat umum pengambilan barang bukti",
    tags: "barang bukti, syarat, pengambilan, putusan pengadilan",
    content:
      "Untuk pengambilan barang bukti, acuan persyaratan yang sering diminta meliputi petikan atau salinan putusan pengadilan, identitas diri seperti KTP, dan surat kuasa apabila pengambilan diwakilkan. Untuk jenis barang tertentu seperti kendaraan, petugas juga dapat meminta dokumen kepemilikan pendukung. Warga sebaiknya diarahkan menyiapkan dokumen asli dan fotokopi bila diperlukan.",
  },
  {
    title: "Informasi umum pengambilan barang bukti tilang",
    tags: "tilang, barang bukti tilang, sim, stnk, verifikasi",
    content:
      "Untuk layanan tilang, warga umumnya perlu menunjukkan bukti tilang dan identitas diri seperti KTP atau SIM. Petugas kemudian memverifikasi data tilang dan menyesuaikan dengan mekanisme pembayaran denda atau biaya perkara yang berlaku di satuan kerja setempat. Bila syarat terpenuhi, barang bukti seperti SIM, STNK, atau kendaraan dapat diserahkan kembali kepada pemohon. Ketentuan detail tetap mengikuti prosedur Kejaksaan Negeri yang menangani perkara tilang tersebut.",
  },
  {
    title: "HALO JPN sebagai layanan konsultasi hukum gratis",
    tags: "halo jpn, datun, konsultasi hukum, gratis",
    content:
      "HALO JPN adalah platform konsultasi hukum resmi dari Kejaksaan Republik Indonesia yang dapat diakses secara daring dan gratis. Layanan ini dipakai untuk membantu masyarakat berkonsultasi langsung dengan Jaksa Pengacara Negara secara profesional. Topik yang dapat dikonsultasikan antara lain pertanahan, ketenagakerjaan, perjanjian atau kontrak, pidana, waris, hutang piutang, mediasi, pernikahan dan perceraian, perlindungan konsumen, kekayaan intelektual, hak asasi manusia, hingga legal drafting.",
  },
  {
    title: "Cara mengakses layanan HALO JPN",
    tags: "halo jpn, akses layanan, tanya jpn gratis, langkah",
    content:
      "Untuk menggunakan layanan HALO JPN, warga dapat membuka laman halojpn.kejaksaan.go.id lalu memilih fitur Tanya JPN Gratis, menyetujui syarat dan ketentuan, mengisi data diri, kemudian menuliskan masalah hukum yang ingin dikonsultasikan. Setelah itu permohonan akan ditindaklanjuti oleh Jaksa Pengacara Negara. Jika warga hanya membutuhkan arahan awal, jelaskan langkah ini secara sederhana dan menenangkan.",
  },
  {
    title: "Pengambilan barang bukti dapat diwakilkan",
    tags: "barang bukti, surat kuasa, perwakilan, layanan",
    content:
      "Pengambilan barang bukti pada umumnya dapat diwakilkan sepanjang memenuhi persyaratan yang diminta oleh layanan setempat, terutama surat kuasa dan identitas pihak yang mewakili. Jelaskan kepada warga bahwa petugas tetap akan melakukan verifikasi untuk memastikan barang bukti diberikan kepada pihak yang berhak, sehingga dokumen kuasa dan identitas harus dibawa dengan lengkap.",
  },
  {
    title: "Penanganan awal pertanyaan penipuan online",
    tags: "penipuan online, pidana umum, kronologi, bukti chat, transfer",
    content:
      "Jika warga menyampaikan dugaan penipuan online, jelaskan dengan tenang bahwa warga sebaiknya menyiapkan kronologi kejadian, identitas pihak yang diketahui, bukti percakapan, bukti transfer, tangkapan layar, tautan akun, nomor telepon, serta dokumen pendukung lain yang relevan. Untuk pelaporan awal tindak pidana, warga biasanya diarahkan lebih dahulu melalui penyidik atau kepolisian. Peran kejaksaan berada pada tahap penuntutan setelah proses penyidikan dan berkas perkara dinyatakan lengkap sesuai ketentuan yang berlaku.",
  },
  {
    title: "Penanganan awal pertanyaan penganiayaan atau kekerasan",
    tags: "penganiayaan, kekerasan, pidana umum, visum, keselamatan",
    content:
      "Jika warga menyampaikan dugaan penganiayaan atau kekerasan, utamakan bahasa yang menenangkan dan aman. Arahkan warga untuk mendahulukan keselamatan diri, mencari pertolongan medis bila diperlukan, dan menyimpan bukti seperti foto luka, visum, identitas saksi, lokasi kejadian, serta kronologi peristiwa. Untuk pelaporan awal perkara pidana, warga pada umumnya diarahkan melalui penyidik atau kepolisian. Kejaksaan kemudian berperan pada tahap penuntutan setelah proses penyidikan berjalan sesuai hukum acara.",
  },
  {
    title: "Penanganan awal pertanyaan sengketa tanah",
    tags: "sengketa tanah, datun, perdata, konsultasi hukum, halo jpn",
    content:
      "Untuk persoalan sengketa tanah, warga perlu diarahkan menjelaskan terlebih dahulu pokok masalahnya, misalnya sengketa kepemilikan, batas tanah, jual beli, waris, atau penguasaan fisik. Jelaskan bahwa persoalan tanah dapat bersinggungan dengan ranah perdata, tata usaha negara, atau pidana tergantung kasusnya. Warga dapat diarahkan menyiapkan sertifikat, girik, AJB, surat waris, peta bidang, atau dokumen lain yang berkaitan. Untuk konsultasi hukum awal, layanan HALO JPN dapat menjadi rujukan yang aman dan resmi.",
  },
  {
    title: "Arti P-21 dalam proses perkara pidana",
    tags: "P-21, berkas lengkap, pidana umum, status perkara",
    content:
      "P-21 adalah penanda bahwa berkas perkara dari penyidik telah dinyatakan lengkap oleh Jaksa Penuntut Umum. Jika warga bertanya arti P-21, jelaskan secara sederhana bahwa pada tahap ini perkara sudah siap untuk dilanjutkan ke proses berikutnya sesuai hukum acara. Hindari memberi kepastian hasil akhir perkara, karena P-21 bukan putusan bersalah atau tidak bersalah, melainkan penanda kelengkapan berkas untuk proses lanjutan.",
  },
  {
    title: "Arti Tahap II dalam proses perkara pidana",
    tags: "Tahap II, tersangka, barang bukti, penuntut umum, status perkara",
    content:
      "Tahap II adalah tahapan ketika tanggung jawab tersangka dan barang bukti diserahkan dari penyidik kepada Jaksa Penuntut Umum setelah berkas perkara dinyatakan lengkap atau P-21. Setelah Tahap II, kewenangan penanganan perkara secara resmi beralih kepada penuntut umum untuk proses lanjutan, termasuk persiapan pelimpahan perkara ke pengadilan. Jelaskan ini dengan bahasa sederhana agar warga memahami bahwa Tahap II adalah tahapan proses, bukan akhir perkara.",
  },
  {
    title: "Cara menjelaskan status perkara pidana secara sederhana",
    tags: "status perkara, penyidikan, p-21, tahap II, sidang",
    content:
      "Jika warga bingung dengan istilah status perkara, jelaskan secara bertahap dan sederhana. Penyidikan adalah proses awal pengumpulan fakta dan alat bukti oleh penyidik. P-21 berarti berkas dinyatakan lengkap oleh Jaksa Penuntut Umum. Tahap II berarti penyerahan tersangka dan barang bukti kepada penuntut umum. Setelah itu perkara dapat dilimpahkan ke pengadilan untuk persidangan. Hindari istilah teknis berlebihan jika warga hanya membutuhkan gambaran umum.",
  },
  {
    title: "Penanganan awal pertanyaan waris dan keluarga",
    tags: "waris, keluarga, ahli waris, surat waris, konsultasi hukum",
    content:
      "Jika warga bertanya soal waris atau masalah keluarga, jelaskan terlebih dahulu bahwa persoalan ini umumnya perlu dipahami dari hubungan keluarga, status perkawinan, keberadaan ahli waris, dan dokumen yang dimiliki. Warga sebaiknya menyiapkan dokumen seperti KTP, KK, akta kelahiran, akta nikah, akta kematian, sertifikat, atau surat lain yang berkaitan. Gunakan bahasa yang tenang dan tidak menghakimi karena isu keluarga sering bersifat sensitif. Untuk arahan awal, warga dapat menggunakan layanan konsultasi hukum resmi seperti HALO JPN agar mendapat penjelasan yang lebih tepat sesuai situasi konkretnya.",
  },
  {
    title: "Penanganan awal pertanyaan utang piutang dan perjanjian",
    tags: "utang piutang, perjanjian, wanprestasi, kontrak, datun",
    content:
      "Jika warga menyampaikan masalah utang piutang atau perjanjian, jelaskan bahwa hal yang paling penting adalah melihat bukti kesepakatan dan kronologi pelaksanaannya. Bukti tersebut bisa berupa surat perjanjian, kuitansi, bukti transfer, chat, email, atau saksi yang mengetahui isi kesepakatan. Terangkan secara sederhana bahwa tidak semua sengketa utang piutang otomatis menjadi perkara pidana, karena banyak yang lebih dulu dinilai dalam ranah perdata atau wanprestasi. Untuk pemahaman awal yang aman, arahkan warga menyiapkan semua bukti dan mempertimbangkan konsultasi hukum resmi.",
  },
  {
    title: "Penanganan awal pertanyaan masalah ketenagakerjaan",
    tags: "ketenagakerjaan, upah, PHK, hubungan kerja, konsultasi",
    content:
      "Jika warga menanyakan persoalan ketenagakerjaan seperti upah, PHK, hak normatif, atau perselisihan hubungan kerja, jelaskan dengan tenang bahwa warga perlu menyiapkan dokumen kerja yang relevan seperti kontrak, slip gaji, surat PHK, absensi, atau bukti komunikasi dengan perusahaan. Sampaikan bahwa perkara ketenagakerjaan biasanya memiliki mekanisme penyelesaian tersendiri, sehingga penanganannya perlu dilihat dari jenis masalah dan bukti yang tersedia. Bila warga masih bingung, arahkan agar terlebih dahulu merapikan kronologi dan dokumen sebelum meminta arahan hukum yang lebih spesifik.",
  },
  {
    title: "Penanganan awal pertanyaan perlindungan konsumen",
    tags: "perlindungan konsumen, barang cacat, jasa, komplain, bukti transaksi",
    content:
      "Jika warga mengeluhkan barang atau jasa yang merugikan, jelaskan bahwa langkah awal yang baik adalah mengumpulkan bukti transaksi, percakapan, foto barang, identitas penjual atau pelaku usaha, dan kronologi kejadian. Gunakan bahasa yang menenangkan agar warga merasa dibantu, lalu terangkan bahwa persoalan perlindungan konsumen bisa terkait hak konsumen, penyelesaian sengketa, atau dalam kondisi tertentu dapat bersinggungan dengan unsur pidana jika ada dugaan penipuan. Hindari menjanjikan hasil, namun bantu warga memahami bukti apa saja yang penting untuk disiapkan.",
  },
  {
    title: "Penanganan awal pertanyaan dugaan korupsi atau penyalahgunaan anggaran",
    tags: "korupsi, penyalahgunaan anggaran, pengaduan, bukti awal, kronologi",
    content:
      "Jika warga ingin menyampaikan dugaan korupsi atau penyalahgunaan anggaran, jelaskan dengan hati-hati bahwa laporan akan lebih mudah ditindaklanjuti bila disertai informasi yang jelas, seperti kronologi, pihak yang diduga terlibat, waktu dan lokasi kejadian, dokumen pendukung, foto, atau bukti transaksi bila ada. Sampaikan secara sopan bahwa warga tidak perlu merasa harus langsung memiliki bukti yang sempurna, namun informasi awal yang runtut dan dapat dipertanggungjawabkan sangat membantu proses penelaahan. Arahkan warga menggunakan kanal pelaporan resmi agar penyampaian informasinya lebih aman dan tertata.",
  },
];

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  for (const entry of entries) {
    const embeddingText = [entry.title, entry.content, entry.tags].filter(Boolean).join(" ");
    const embeddingResult = await model.embedContent(embeddingText);
    const vector = `[${embeddingResult.embedding.values.join(",")}]`;

    const existing = await sql`select id from ai_knowledge_entries where title = ${entry.title} limit 1`;

    if (existing.length > 0) {
      await sql`
        update ai_knowledge_entries
        set
          content = ${entry.content},
          tags = ${entry.tags},
          is_active = true,
          embedding = ${vector}::vector,
          updated_at = now()
        where id = ${existing[0].id}
      `;
      console.log(`updated: ${entry.title}`);
    } else {
      await sql`
        insert into ai_knowledge_entries (title, content, tags, is_active, embedding)
        values (${entry.title}, ${entry.content}, ${entry.tags}, true, ${vector}::vector)
      `;
      console.log(`inserted: ${entry.title}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
