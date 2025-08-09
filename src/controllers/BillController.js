import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getBills = async (req, res) => {
  const { email, tahun, bulan } = req.query;

  try {
    const billsWithTagihan = await prisma.bills.findMany({
      where: {
        AND: [
          email
            ? {
                user: {
                  email: {
                    contains: email,
                    mode: "insensitive",
                  },
                },
              }
            : {},

          tahun && bulan
            ? {
                created_at: {
                  gte: new Date(parseInt(tahun), parseInt(bulan) - 1, 1),
                  lt: new Date(parseInt(tahun), parseInt(bulan), 1),
                },
              }
            : tahun
            ? {
                created_at: {
                  gte: new Date(parseInt(tahun), 0, 1),
                  lt: new Date(parseInt(tahun) + 1, 0, 1),
                },
              }
            : {},
        ],
      },
      include: {
        user: true,
      },
    });

    const dataDenganTagihan = billsWithTagihan.map((bill) => {
      const pemakaian = Number(bill.pemakaian);
      const bebanTetap = 5000;

      const usage0To10 = Math.min(pemakaian, 10);
      const usage11To20 = Math.min(Math.max(pemakaian - 10, 0), 10);
      const usageAbove20 = Math.max(pemakaian - 20, 0);

      const cost0To10 = usage0To10 * 500;
      const cost11To20 = usage11To20 * 600;
      const costAbove20 = usageAbove20 * 700;

      const totalPayment = bebanTetap + cost0To10 + cost11To20 + costAbove20;

      return {
        id: bill.id,
        customerName: bill.user.nama,
        startReading: bill.catatan_awal,
        endReading: bill.catatan_akhir,
        usage: pemakaian,
        usage0To10,
        usage11To20,
        usageAbove20,
        baseCharge: bebanTetap,
        cost0To10,
        cost11To20,
        costAbove20,
        totalPayment,
        status: bill.status,
        proof: bill.file_foto,
        created_at: bill.created_at,
      };
    });

    res.status(200).json({ result: dataDenganTagihan });
  } catch (error) {
    console.error("Error retrieving bills:", error);
    res.status(500).send("Error retrieving bills");
  }
};

export const getInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const billsWithTagihan = await prisma.bills.findFirstOrThrow({
      where: {
        id: parseInt(id),
      },
      include: {
        user: true,
      },
    });

    const pemakaian = Number(billsWithTagihan.pemakaian);
    const bebanTetap = 5000;

    const usage0To10 = Math.min(pemakaian, 10);
    const usage11To20 = Math.min(Math.max(pemakaian - 10, 0), 10);
    const usageAbove20 = Math.max(pemakaian - 20, 0);

    const cost0To10 = usage0To10 * 500;
    const cost11To20 = usage11To20 * 600;
    const costAbove20 = usageAbove20 * 700;

    const totalPayment = bebanTetap + cost0To10 + cost11To20 + costAbove20;

    res.status(200).json({
      id: billsWithTagihan.id,
      customerName: billsWithTagihan.user.nama,
      startReading: billsWithTagihan.catatan_awal,
      endReading: billsWithTagihan.catatan_akhir,
      usage: pemakaian,
      usage0To10,
      usage11To20,
      usageAbove20,
      baseCharge: bebanTetap,
      cost0To10,
      cost11To20,
      costAbove20,
      totalPayment,
      status: billsWithTagihan.status,
      proof: billsWithTagihan.file_foto,
      created_at: billsWithTagihan.created_at,
    });
  } catch (error) {
    console.error("Error retrieving bills:", error);
    res.status(500).send("Error retrieving bills");
  }
};

export async function getTotalWeb(req, res) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  try {
    // 1. Menghitung Total Pelanggan (unique users with bills)
    const totalPelanggan = await prisma.users.count({
      where: {
        role: "Pelanggan",
      },
    });

    // 2. Menghitung Total Tagihan Bulan Ini
    const bills = await prisma.bills.findMany({
      where: {
        created_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const dataDenganTagihan = bills.map((bill) => {
      const pemakaian = Number(bill.pemakaian);
      const bebanTetap = 5000;

      const usage0To10 = Math.min(pemakaian, 10);
      const usage11To20 = Math.min(Math.max(pemakaian - 10, 0), 10);
      const usageAbove20 = Math.max(pemakaian - 20, 0);

      const cost0To10 = usage0To10 * 500;
      const cost11To20 = usage11To20 * 600;
      const costAbove20 = usageAbove20 * 700;

      const totalPayment = bebanTetap + cost0To10 + cost11To20 + costAbove20;

      return {
        totalPayment,
      };
    });

    const totalTagihan = dataDenganTagihan.reduce((total, bill) => {
      return total + bill.totalPayment;
    }, 0);

    // 3. Menghitung Total Pemakaian Bulan Ini
    const totalPemakaian = bills.reduce((total, bill) => {
      return total + parseFloat(bill.pemakaian.toString());
    }, 0);

    const query = `SELECT substring(e.x, 1, 2) as "month" ,count(a.id) as data 
    FROM (select to_char((current_date + interval '1 month' * a),'mm-yyyy') 
    AS x FROM generate_series(0,11) AS s(a)) 
    e 
    left join 
    ( SELECT id,to_char("created_at",'MM-YYYY') as xx 
      FROM "bills" ) a on a.xx = e.x group by e.x order by 1;`;

    const result = await prisma.$queryRawUnsafe(query);

    result.forEach((v) => {
      v.data = Number(v.data);
    });

    const formatted = result.map((item) => item.data);

    const monthlyTagihan = [
      {
        name: "Harga",
        data: formatted,
      },
    ];

    res.status(200).json({
      totalPelanggan,
      totalTagihan,
      totalPemakaian,
      monthlyTagihan,
    });
  } catch (error) {
    console.error("Error calculating totals:", error);
    res.status(500).json({ error: "Failed to calculate totals" });
  }
}

export const getMonthlyUsageSummary = async (req, res) => {
  try {
    const { email, tahun } = req.query;
    const year = parseInt(tahun) || new Date().getFullYear();

    const now = new Date();
    const currentMonth = now.getMonth();

    // Batas waktu bulan ini
    const startOfThisMonth = new Date(year, currentMonth, 1);
    const endOfThisMonth = new Date(year, currentMonth + 1, 0, 23, 59, 59);

    // Batas waktu bulan lalu
    const startOfLastMonth = new Date(year, currentMonth - 1, 1);
    const endOfLastMonth = new Date(year, currentMonth, 0, 23, 59, 59);

    // Ambil user (biar dapet ID)
    const user = await prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Pemakaian bulan ini
    const thisMonth = await prisma.bills.aggregate({
      _sum: { pemakaian: true },
      where: {
        id_user: user.id,
        created_at: {
          gte: startOfThisMonth,
          lte: endOfThisMonth,
        },
      },
    });

    // Pemakaian bulan lalu
    const lastMonth = await prisma.bills.aggregate({
      _sum: { pemakaian: true },
      where: {
        id_user: user.id,
        created_at: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    const totalTagihanBulanIni = handleHitungTotalTagihan(
      thisMonth._sum.pemakaian
    );
    const totalTagihanBulanLalu = handleHitungTotalTagihan(
      lastMonth._sum.pemakaian
    );

    const bulanIni = Number(thisMonth._sum.pemakaian || 0);
    const bulanLalu = Number(lastMonth._sum.pemakaian || 0);
    const selisih = bulanIni - bulanLalu;

    res.status(200).json({
      email,
      tahun: year,
      bulanIni,
      totalTagihanBulanIni: totalTagihanBulanIni,
      bulanLalu,
      totalTagihanBulanLalu: totalTagihanBulanLalu,
      selisih,
    });
  } catch (error) {
    console.error("Gagal ambil data pemakaian:", error);
    res.status(500).json({ error: "Gagal ambil data pemakaian" });
  }
};

function handleHitungTotalTagihan(pemakaian) {
  const bebanTetap = 5000;

  const usage0To10 = Math.min(pemakaian, 10);
  const usage11To20 = Math.min(Math.max(pemakaian - 10, 0), 10);
  const usageAbove20 = Math.max(pemakaian - 20, 0);

  const cost0To10 = usage0To10 * 500;
  const cost11To20 = usage11To20 * 600;
  const costAbove20 = usageAbove20 * 700;

  const totalPayment = bebanTetap + cost0To10 + cost11To20 + costAbove20;

  return totalPayment;
}
