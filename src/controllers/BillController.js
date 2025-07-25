import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getBills = async (req, res) => {
  try {
    const billsWithTagihan = await prisma.bills.findMany({
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
        id: bill.id, // Assuming `bill.id` is the unique ID for each bill
        customerName: bill.user.nama,
        startReading: bill.catatan_awal, // Assuming `startReading` exists in the data
        endReading: bill.catatan_akhir, // Assuming `endReading` exists in the data
        usage: pemakaian,
        usage0To10,
        usage11To20,
        usageAbove20,
        baseCharge: bebanTetap,
        cost0To10,
        cost11To20,
        costAbove20,
        totalPayment,
        status: bill.status, // Assuming `status` exists in the data
        proof: bill.file_foto,
      };
    });

    res.status(200).json({
      result: dataDenganTagihan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving bills");
  }
};

export async function getTotals(req, res) {
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
      return total + parseFloat(bill.pemakaian.toString()); // Menjumlahkan semua pemakaian
    }, 0);

    // 4. Menghitung Total Tagihan Bulanan (per bulan)
    // Array untuk menyimpan total tagihan per bulan (Jan - Dec)
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

    // Mengirimkan response dengan semua data yang telah dihitung

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
