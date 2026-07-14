const express = require("express");

const router = express.Router();

const db = require("../config/db");

/*=========================================================
DANH SÁCH TIÊU CHÍ
=========================================================*/

router.get("/criteria", (req, res) => {
  const sql = `
    SELECT

      id,

      group_name,

      title,

      score,

      choice_group,

      need_proof,

      sort_order

    FROM conduct_criteria

    ORDER BY

      group_name ASC,

      sort_order ASC,

      id ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).send("Không thể tải danh sách tiêu chí");
    }

    res.json(result);
  });
});
/*=========================================================
CHI TIẾT TIÊU CHÍ
=========================================================*/

router.get("/criteria/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT

      id,

      group_name,

      title,

      score,

      choice_group,

      need_proof,

      sort_order

    FROM conduct_criteria

    WHERE id=?

    LIMIT 1
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).send("Lỗi hệ thống");
    }

    if (result.length === 0) {
      return res.status(404).send("Không tìm thấy tiêu chí");
    }

    res.json(result[0]);
  });
});
/*=========================================================
THÊM TIÊU CHÍ
=========================================================*/

router.post("/add-criteria", (req, res) => {
  let { group_name, title, score, choice_group, need_proof, sort_order } =
    req.body;

  group_name = group_name?.trim();

  title = title?.trim();

  score = Number(score);

  sort_order = Number(sort_order);

  need_proof = Number(need_proof) || 0;

  if (
    !group_name ||
    !title ||
    Number.isNaN(score) ||
    Number.isNaN(sort_order)
  ) {
    return res.status(400).send("Vui lòng nhập đầy đủ thông tin");
  }

  const sql = `
    INSERT INTO conduct_criteria
    (
      group_name,
      title,
      score,
      choice_group,
      need_proof,
      sort_order
    )
    VALUES
    (
      ?,?,?,?,?,?
    )
  `;

  db.query(
    sql,
    [
      group_name,
      title,
      score || 0,
      choice_group || null,
      need_proof,
      sort_order || 0,
    ],
    (err) => {
      if (err) {
        console.log(err);

        return res.send("Không thể thêm tiêu chí");
      }

      res.send("Thêm tiêu chí thành công");
    },
  );
});
/*=========================================================
CẬP NHẬT TIÊU CHÍ
=========================================================*/

router.post("/update-criteria", (req, res) => {
  let { id, group_name, title, score, choice_group, need_proof, sort_order } =
    req.body;

  group_name = group_name?.trim();

  title = title?.trim();

  score = Number(score);

  sort_order = Number(sort_order);

  need_proof = Number(need_proof) || 0;

  if (
    !id ||
    !group_name ||
    !title ||
    Number.isNaN(score) ||
    Number.isNaN(sort_order)
  ) {
    return res.status(400).send("Vui lòng nhập đầy đủ thông tin");
  }

  const sql = `
    UPDATE conduct_criteria

    SET

      group_name=?,

      title=?,

      score=?,

      choice_group=?,

      need_proof=?,

      sort_order=?

    WHERE id=?
  `;

  db.query(
    sql,
    [
      group_name,
      title,
      score,
      choice_group || null,
      need_proof,
      sort_order,
      id,
    ],
    (err) => {
      if (err) {
        console.log(err);

        return res.send("Không thể cập nhật tiêu chí");
      }

      res.send("Cập nhật tiêu chí thành công");
    },
  );
});
/*=========================================================
XÓA TIÊU CHÍ
=========================================================*/

router.post("/delete-criteria", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.send("Thiếu ID tiêu chí");
  }

  /*-------------------------------------------------------
  KIỂM TRA ĐÃ ĐƯỢC SỬ DỤNG
  -------------------------------------------------------*/

  db.query(
    `
    SELECT id

    FROM conduct_answers

    WHERE criteria_id=?

    LIMIT 1
    `,
    [id],
    (err, answerResult) => {
      if (err) {
        console.log(err);

        return res.send("Lỗi hệ thống");
      }

      if (answerResult.length > 0) {
        return res.send("Tiêu chí đã có dữ liệu đánh giá, không thể xóa");
      }

      /*-------------------------------------------------------
      XÓA TIÊU CHÍ
      -------------------------------------------------------*/

      db.query(
        `
        DELETE

        FROM conduct_criteria

        WHERE id=?
        `,
        [id],
        (err) => {
          if (err) {
            console.log(err);

            return res.send("Không thể xóa tiêu chí");
          }

          res.send("Xóa tiêu chí thành công");
        },
      );
    },
  );
});

/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
