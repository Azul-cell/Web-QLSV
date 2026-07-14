const express = require("express");
const db = require("../config/db");
const router = express.Router();

const {
  getCurrentPeriod,
  getPeriodById,
  getAllPeriods,
  createPeriod,
  openPeriod,
  lockPeriod,
  reopenPeriod,
  canSubmit,
} = require("../helpers/conductPeriod");

/*=========================================================
LẤY ĐỢT ĐANG MỞ
=========================================================*/

router.get("/current-period", async (req, res) => {
  try {
    const period = await getCurrentPeriod();

    if (!period) {
      return res.json(null);
    }

    res.json(period);
  } catch (err) {
    console.log(err);

    res.status(500).send("Lỗi hệ thống");
  }
});

/*=========================================================
LẤY MỘT ĐỢT
=========================================================*/

router.get("/period/:id", async (req, res) => {
  try {
    const period = await getPeriodById(req.params.id);

    if (!period) {
      return res.status(404).send("Không tìm thấy đợt");
    }

    res.json(period);
  } catch (err) {
    console.log(err);

    res.status(500).send("Lỗi hệ thống");
  }
});

/*=========================================================
LẤY DANH SÁCH ĐỢT
=========================================================*/

router.get("/periods", async (req, res) => {
  try {
    const periods = await getAllPeriods();

    res.json(periods);
  } catch (err) {
    console.log(err);

    res.status(500).send("Lỗi hệ thống");
  }
});
/*=========================================================
TẠO ĐỢT ĐÁNH GIÁ
=========================================================*/

router.post("/create-period", async (req, res) => {
  try {
    const { hoc_ky, nam_hoc, ngay_mo, ngay_dong } = req.body;

    if (!hoc_ky || !nam_hoc || !ngay_mo || !ngay_dong) {
      return res.status(400).send("Thiếu dữ liệu");
    }

    const periodId = await createPeriod({
      hoc_ky,
      nam_hoc,
      ngay_mo,
      ngay_dong,
    });

    res.json({
      success: true,
      periodId,
      message: "Tạo đợt đánh giá thành công",
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể tạo đợt đánh giá");
  }
});

/*=========================================================
MỞ ĐỢT ĐÁNH GIÁ
=========================================================*/

router.post("/open-period", async (req, res) => {
  try {
    const { periodId } = req.body;

    if (!periodId) {
      return res.status(400).send("Thiếu periodId");
    }

    await openPeriod(periodId);

    res.json({
      success: true,
      message: "Mở đợt đánh giá thành công",
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể mở đợt đánh giá");
  }
});
/*=========================================================
KHÓA ĐỢT ĐÁNH GIÁ
=========================================================*/

router.post("/lock-period", async (req, res) => {
  try {
    const { periodId } = req.body;

    if (!periodId) {
      return res.status(400).send("Thiếu periodId");
    }

    await lockPeriod(periodId);

    res.json({
      success: true,
      message: "Khóa đợt đánh giá thành công",
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể khóa đợt đánh giá");
  }
});

/*=========================================================
MỞ LẠI ĐỢT ĐÁNH GIÁ
=========================================================*/

router.post("/reopen-period", async (req, res) => {
  try {
    const { periodId } = req.body;

    if (!periodId) {
      return res.status(400).send("Thiếu periodId");
    }

    await reopenPeriod(periodId);

    res.json({
      success: true,
      message: "Mở lại đợt đánh giá thành công",
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể mở lại đợt đánh giá");
  }
});

/*=========================================================
KIỂM TRA CÓ THỂ NỘP ĐÁNH GIÁ
=========================================================*/

router.get("/can-submit/:periodId", async (req, res) => {
  try {
    const result = await canSubmit(req.params.periodId);

    res.json(result);
  } catch (err) {
    console.log(err);

    res.status(500).send("Lỗi hệ thống");
  }
});
/*=========================================================
XÓA ĐỢT ĐÁNH GIÁ
=========================================================*/

router.post("/delete-period", (req, res) => {
  const { periodId } = req.body;

  if (!periodId) {
    return res.status(400).send("Thiếu periodId");
  }

  /*-------------------------------------------------------
  KIỂM TRA ĐÃ CÓ KẾT QUẢ
  -------------------------------------------------------*/

  db.query(
    `
    SELECT id

    FROM conduct_results

    WHERE period_id=?

    LIMIT 1
    `,
    [periodId],
    (err, result) => {
      if (err) {
        console.log(err);

        return res.status(500).send("Lỗi hệ thống");
      }

      if (result.length > 0) {
        return res.send("Đợt đánh giá đã có dữ liệu, không thể xóa");
      }

      db.query(
        `
        DELETE

        FROM conduct_periods

        WHERE id=?
        `,
        [periodId],
        (err) => {
          if (err) {
            console.log(err);

            return res.status(500).send("Không thể xóa");
          }

          res.send("Xóa đợt đánh giá thành công");
        },
      );
    },
  );
});
module.exports = router;
