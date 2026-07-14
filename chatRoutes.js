const express = require("express");
const router = express.Router();

const db = require("../config/db");

const fs = require("fs");
const path = require("path");
const multer = require("multer");

/*=========================================================
UPLOAD FOLDER
=========================================================*/

const ROOT = path.join(__dirname, "../uploads");

const CHAT = path.join(ROOT, "chat");

const IMAGE = path.join(CHAT, "images");

const FILE = path.join(CHAT, "files");

if (!fs.existsSync(ROOT)) {
  fs.mkdirSync(ROOT);
}

if (!fs.existsSync(CHAT)) {
  fs.mkdirSync(CHAT);
}

if (!fs.existsSync(IMAGE)) {
  fs.mkdirSync(IMAGE);
}

if (!fs.existsSync(FILE)) {
  fs.mkdirSync(FILE);
}

/*=========================================================
IMAGE STORAGE
=========================================================*/

const imageStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, IMAGE);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    cb(
      null,

      "CHAT_IMG_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 1000000) +
        ext,
    );
  },
});

/*=========================================================
FILE STORAGE
=========================================================*/

const fileStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, FILE);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    cb(
      null,

      "CHAT_FILE_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 1000000) +
        ext,
    );
  },
});

/*=========================================================
IMAGE FILTER
=========================================================*/

function imageFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  const allow = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

  if (!allow.includes(ext)) {
    return cb(new Error("Ảnh không hợp lệ"));
  }

  cb(null, true);
}

/*=========================================================
FILE FILTER
=========================================================*/

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  const allow = [
    ".pdf",

    ".doc",
    ".docx",

    ".xls",
    ".xlsx",

    ".ppt",
    ".pptx",

    ".zip",
    ".rar",
  ];

  if (!allow.includes(ext)) {
    return cb(new Error("File không hợp lệ"));
  }

  cb(null, true);
}

/*=========================================================
UPLOAD IMAGE
=========================================================*/

const uploadImage = multer({
  storage: imageStorage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: imageFilter,
});

/*=========================================================
UPLOAD FILE
=========================================================*/

const uploadFile = multer({
  storage: fileStorage,

  limits: {
    fileSize: 30 * 1024 * 1024,
  },

  fileFilter: fileFilter,
});

/*=========================================================
UPLOAD IMAGE API
=========================================================*/

router.post(
  "/chat/upload/image",

  uploadImage.single("image"),

  (req, res) => {
    if (!req.file) {
      return res.json({
        success: false,

        message: "Không có ảnh.",
      });
    }

    res.json({
      success: true,

      image: req.file.filename,

      url: "/uploads/chat/images/" + req.file.filename,
    });
  },
);

/*=========================================================
UPLOAD FILE API
=========================================================*/

router.post(
  "/chat/upload/file",

  uploadFile.single("file"),

  (req, res) => {
    if (!req.file) {
      return res.json({
        success: false,

        message: "Không có file.",
      });
    }

    res.json({
      success: true,

      file: req.file.filename,

      fileName: req.file.originalname,

      url: "/uploads/chat/files/" + req.file.filename,
    });
  },
);
/*=========================================================
FIND DEFAULT CLASS GROUP
=========================================================*/

function findDefaultClassGroup(classId) {
  return new Promise((resolve, reject) => {
    db.query(
      `
            SELECT *

            FROM chat_groups

            WHERE

                class_id=?

            AND

                is_default=1

            AND

                is_deleted=0

            LIMIT 1
            `,

      [classId],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        if (result.length === 0) {
          return resolve(null);
        }

        resolve(result[0]);
      },
    );
  });
}

/*=========================================================
CREATE DEFAULT CLASS GROUP
=========================================================*/

function createDefaultGroup(
  classId,

  teacherUserId,

  className,
) {
  return new Promise((resolve, reject) => {
    db.query(
      `
            INSERT INTO chat_groups
            (
                parent_id,
                class_id,
                creator_id,
                group_name,
                group_type,
                is_default
            )
            VALUES
            (
                NULL,
                ?,
                ?,
                ?,
                'class',
                1
            )
            `,

      [classId, teacherUserId, className],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result.insertId);
      },
    );
  });
}

/*=========================================================
ADD MEMBER
=========================================================*/

function addMember(
  groupId,

  userId,
) {
  return new Promise((resolve, reject) => {
    db.query(
      `
            INSERT IGNORE INTO
            chat_group_members
            (
                group_id,
                user_id
            )
            VALUES
            (
                ?,
                ?
            )
            `,

      [groupId, userId],

      (err) => {
        if (err) {
          return reject(err);
        }

        resolve(true);
      },
    );
  });
}

/*=========================================================
ADD ALL STUDENTS
=========================================================*/

function addAllStudents(
  groupId,

  classId,
) {
  return new Promise((resolve, reject) => {
    db.query(
      `
            SELECT

                s.user_id

            FROM class_students cs

            JOIN students s

                ON cs.student_id=s.id

            WHERE

                cs.class_id=?
            `,

      [classId],

      async (err, result) => {
        if (err) {
          return reject(err);
        }

        for (const item of result) {
          await addMember(
            groupId,

            item.user_id,
          );
        }

        resolve(true);
      },
    );
  });
}

/*=========================================================
GET OR CREATE CLASS GROUP
=========================================================*/

async function getOrCreateClassGroup(
  classId,

  teacherUserId,

  className,
) {
  let group = await findDefaultClassGroup(classId);

  if (group) {
    return group;
  }

  const groupId = await createDefaultGroup(
    classId,

    teacherUserId,

    className,
  );

  await addMember(
    groupId,

    teacherUserId,
  );

  await addAllStudents(
    groupId,

    classId,
  );

  return {
    id: groupId,

    class_id: classId,

    group_name: className,

    is_default: 1,
  };
}

/*=========================================================
GET CLASS INFO
=========================================================*/

function getClassInfo(classId) {
  return new Promise((resolve, reject) => {
    db.query(
      `
            SELECT

                c.id,

                c.tenlop,

                t.user_id

            FROM classes c

            JOIN teachers t

                ON c.teacher_id=t.id

            WHERE

                c.id=?

            LIMIT 1
            `,

      [classId],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        if (result.length === 0) {
          return resolve(null);
        }

        resolve(result[0]);
      },
    );
  });
}
/*=========================================================
GET TEACHER CLASS
=========================================================*/

router.get(
  "/chat/teacher/classes/:userId",

  (req, res) => {
    db.query(
      `
            SELECT

                c.id,

                c.malop,

                c.tenlop

            FROM classes c

            JOIN teachers t

                ON c.teacher_id=t.id

            WHERE

                t.user_id=?

            ORDER BY

                c.tenlop
            `,

      [req.params.userId],

      (err, result) => {
        if (err) {
          console.log(err);

          return res.json({
            success: false,

            message: "Không tải được danh sách lớp.",
          });
        }

        res.json({
          success: true,

          data: result,
        });
      },
    );
  },
);

/*=========================================================
OPEN CLASS CHAT
=========================================================*/

router.get(
  "/chat/class/:classId",

  async (req, res) => {
    try {
      const classId = Number(req.params.classId);

      const info = await getClassInfo(classId);

      if (!info) {
        return res.json({
          success: false,

          message: "Không tìm thấy lớp.",
        });
      }

      const group = await getOrCreateClassGroup(
        info.id,

        info.user_id,

        info.tenlop,
      );

      res.json({
        success: true,

        group,
      });
    } catch (err) {
      console.log(err);

      res.json({
        success: false,

        message: "Không thể mở nhóm chat.",
      });
    }
  },
);

/*=========================================================
CHECK USER IN GROUP
=========================================================*/

function checkMember(
  groupId,

  userId,
) {
  return new Promise((resolve, reject) => {
    db.query(
      `
            SELECT id

            FROM chat_group_members

            WHERE

                group_id=?

            AND

                user_id=?

            LIMIT 1
            `,

      [groupId, userId],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result.length > 0);
      },
    );
  });
}

/*=========================================================
JOIN DEFAULT GROUP
=========================================================*/

router.post(
  "/chat/class/join",

  async (req, res) => {
    try {
      const {
        group_id,

        user_id,
      } = req.body;

      const exist = await checkMember(
        group_id,

        user_id,
      );

      if (exist) {
        return res.json({
          success: true,

          message: "Đã tham gia.",
        });
      }

      await addMember(
        group_id,

        user_id,
      );

      res.json({
        success: true,

        message: "Tham gia thành công.",
      });
    } catch (err) {
      console.log(err);

      res.json({
        success: false,

        message: "Không thể tham gia.",
      });
    }
  },
);
/*=========================================================
GET TEACHER GROUPS
=========================================================*/

function getTeacherGroups(userId) {
  return new Promise((resolve, reject) => {
    db.query(
      `

            SELECT

                g.id,

                g.parent_id,

                g.class_id,

                g.group_name,

                g.group_type,

                g.is_default,

                g.created_at,

                c.tenlop

            FROM chat_groups g

            JOIN classes c

                ON c.id=g.class_id

            JOIN teachers t

                ON c.teacher_id=t.id

            WHERE

                t.user_id=?

            AND

                g.is_deleted=0

            ORDER BY

                g.is_default DESC,

                g.group_name

            `,

      [userId],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      },
    );
  });
}

/*=========================================================
GET STUDENT GROUPS
=========================================================*/

function getStudentGroups(userId) {
  return new Promise((resolve, reject) => {
    db.query(
      `

            SELECT

                g.id,

                g.parent_id,

                g.class_id,

                g.group_name,

                g.group_type,

                g.is_default,

                g.created_at,

                c.tenlop

            FROM chat_group_members m

            JOIN chat_groups g

                ON g.id=m.group_id

            JOIN classes c

                ON c.id=g.class_id

            WHERE

                m.user_id=?

            AND

                g.is_deleted=0

            ORDER BY

                g.is_default DESC,

                g.group_name

            `,

      [userId],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      },
    );
  });
}

/*=========================================================
GET ADMIN GROUPS
=========================================================*/

function getAdminGroups() {
  return new Promise((resolve, reject) => {
    db.query(
      `

            SELECT

                g.id,

                g.parent_id,

                g.class_id,

                g.group_name,

                g.group_type,

                g.is_default,

                g.created_at,

                c.tenlop

            FROM chat_groups g

            LEFT JOIN classes c

                ON c.id=g.class_id

            WHERE

                g.is_deleted=0

            ORDER BY

                g.class_id,

                g.is_default DESC,

                g.group_name

            `,

      [],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      },
    );
  });
}

/*=========================================================
GET GROUP LIST
=========================================================*/

router.get(
  "/chat/groups",

  async (req, res) => {
    try {
      const {
        role,

        userId,
      } = req.query;

      let data = [];

      if (role === "teacher") {
        data = await getTeacherGroups(userId);
      } else if (role === "student") {
        data = await getStudentGroups(userId);
      } else {
        data = await getAdminGroups();
      }

      res.json({
        success: true,

        data,
      });
    } catch (err) {
      console.log(err);

      res.json({
        success: false,

        message: "Không tải được danh sách nhóm.",
      });
    }
  },
);
/*=========================================================
GET CLASS STUDENTS
=========================================================*/

router.get(
  "/chat/class/:classId/students",

  (req, res) => {
    db.query(
      `

            SELECT

                u.id,

                u.hoten

            FROM class_students cs

            JOIN students s

                ON cs.student_id=s.id

            JOIN users u

                ON u.id=s.user_id

            WHERE

                cs.class_id=?

            ORDER BY

                u.hoten

            `,

      [req.params.classId],

      (err, result) => {
        if (err) {
          console.log(err);

          return res.json({
            success: false,

            message: "Không tải được sinh viên.",
          });
        }

        res.json({
          success: true,

          data: result,
        });
      },
    );
  },
);

/*=========================================================
CHECK GROUP NAME
=========================================================*/

function checkGroupName(
  classId,

  groupName,
) {
  return new Promise((resolve, reject) => {
    db.query(
      `

            SELECT id

            FROM chat_groups

            WHERE

                class_id=?

            AND

                group_name=?

            AND

                is_deleted=0

            LIMIT 1

            `,

      [classId, groupName],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result.length > 0);
      },
    );
  });
}

/*=========================================================
CREATE SMALL GROUP
=========================================================*/

function createSmallGroup(data) {
  return new Promise((resolve, reject) => {
    db.query(
      `

            INSERT INTO

            chat_groups

            (

                parent_id,

                class_id,

                creator_id,

                group_name,

                group_type,

                is_default

            )

            VALUES

            (

                ?,

                ?,

                ?,

                ?,

                'group',

                0

            )

            `,

      [data.parent_id, data.class_id, data.creator_id, data.group_name],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result.insertId);
      },
    );
  });
}

/*=========================================================
ADD MEMBERS
=========================================================*/

async function addMembers(
  groupId,

  members,
) {
  if (!Array.isArray(members)) {
    return;
  }

  for (const userId of members) {
    await addMember(
      groupId,

      userId,
    );
  }
}
/*=========================================================
CREATE GROUP
=========================================================*/

router.post(
  "/chat/group/create",

  async (req, res) => {
    try {
      const {
        parent_id,

        class_id,

        creator_id,

        group_name,

        members,
      } = req.body;

      if (!parent_id) {
        return res.json({
          success: false,

          message: "Thiếu nhóm lớp.",
        });
      }

      if (!group_name) {
        return res.json({
          success: false,

          message: "Nhập tên nhóm.",
        });
      }

      const exist = await checkGroupName(
        class_id,

        group_name,
      );

      if (exist) {
        return res.json({
          success: false,

          message: "Tên nhóm đã tồn tại.",
        });
      }

      const groupId = await createSmallGroup({
        parent_id,

        class_id,

        creator_id,

        group_name,
      });

      await addMember(
        groupId,

        creator_id,
      );

      await addMembers(
        groupId,

        members,
      );

      res.json({
        success: true,

        groupId,
      });
    } catch (err) {
      console.log(err);

      res.json({
        success: false,

        message: "Không thể tạo nhóm.",
      });
    }
  },
);

/*=========================================================
GET GROUP MEMBERS
=========================================================*/

function getGroupMembers(groupId) {
  return new Promise((resolve, reject) => {
    db.query(
      `

            SELECT

                u.id,

                u.hoten,

                u.avatar,

                u.role

            FROM chat_group_members gm

            JOIN users u

                ON u.id=gm.user_id

            WHERE

                gm.group_id=?

            ORDER BY

                u.hoten

            `,

      [groupId],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      },
    );
  });
}

/*=========================================================
GROUP MEMBER LIST
=========================================================*/

router.get(
  "/chat/group/:groupId/members",

  async (req, res) => {
    try {
      const data = await getGroupMembers(req.params.groupId);

      res.json({
        success: true,

        data,
      });
    } catch (err) {
      console.log(err);

      res.json({
        success: false,

        message: "Không tải được thành viên.",
      });
    }
  },
);
/*=========================================================
GET MESSAGES
=========================================================*/

function getMessages(groupId) {
  return new Promise((resolve, reject) => {
    db.query(
      `

            SELECT

                m.id,

                m.group_id,

                m.sender_id,

                u.hoten,

                u.avatar,

                u.role,

                m.message_type,

                m.content,

                m.file_name,

                m.file_path,

                m.created_at

            FROM group_messages m

            JOIN users u

                ON u.id=m.sender_id

            WHERE

                m.group_id=?

            AND

                m.is_deleted=0

            ORDER BY

                m.created_at ASC

            `,

      [groupId],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      },
    );
  });
}

/*=========================================================
LOAD MESSAGE
=========================================================*/

router.get(
  "/chat/messages/:groupId",

  async (req, res) => {
    try {
      const groupId = Number(req.params.groupId);

      const data = await getMessages(groupId);

      res.json({
        success: true,

        data,
      });
    } catch (err) {
      console.log(err);

      res.json({
        success: false,

        message: "Không tải được tin nhắn.",
      });
    }
  },
);

/*=========================================================
SAVE MESSAGE
=========================================================*/

function saveMessage(data) {
  return new Promise((resolve, reject) => {
    db.query(
      `

            INSERT INTO

            group_messages

            (

                group_id,

                sender_id,

                message_type,

                content,

                file_name,

                file_path

            )

            VALUES

            (

                ?,

                ?,

                ?,

                ?,

                ?,

                ?

            )

            `,

      [
        data.group_id,

        data.sender_id,

        data.message_type,

        data.content,

        data.file_name,

        data.file_path,
      ],

      (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result.insertId);
      },
    );
  });
}
/*=========================================================
SEND MESSAGE
=========================================================*/

router.post(
  "/chat/message",

  async (req, res) => {
    try {
      const {
        group_id,

        sender_id,

        message_type,

        content,

        file_name,

        file_path,
      } = req.body;

      if (!group_id) {
        return res.json({
          success: false,

          message: "Thiếu nhóm chat.",
        });
      }

      if (!sender_id) {
        return res.json({
          success: false,

          message: "Thiếu người gửi.",
        });
      }

      if (!content && !file_path) {
        return res.json({
          success: false,

          message: "Tin nhắn trống.",
        });
      }

      const messageId = await saveMessage({
        group_id,

        sender_id,

        message_type: message_type || "text",

        content: content || null,

        file_name: file_name || null,

        file_path: file_path || null,
      });

      res.json({
        success: true,

        messageId,

        message: "Đã gửi.",
      });
    } catch (err) {
      console.log(err);

      res.json({
        success: false,

        message: "Không gửi được tin nhắn.",
      });
    }
  },
);

/*=========================================================
DELETE MESSAGE
=========================================================*/

router.delete(
  "/chat/message/:id",

  (req, res) => {
    db.query(
      `

            UPDATE

                group_messages

            SET

                is_deleted=1

            WHERE

                id=?

            `,

      [req.params.id],

      (err) => {
        if (err) {
          console.log(err);

          return res.json({
            success: false,

            message: "Không thể xóa.",
          });
        }

        res.json({
          success: true,

          message: "Đã xóa.",
        });
      },
    );
  },
);

/*=========================================================
CHECK GROUP EXISTS
=========================================================*/

router.get(
  "/chat/group/:groupId",

  (req, res) => {
    db.query(
      `

            SELECT

                *

            FROM

                chat_groups

            WHERE

                id=?

            AND

                is_deleted=0

            LIMIT 1

            `,

      [req.params.groupId],

      (err, result) => {
        if (err) {
          console.log(err);

          return res.json({
            success: false,
          });
        }

        if (result.length === 0) {
          return res.json({
            success: false,

            message: "Không tìm thấy nhóm.",
          });
        }

        res.json({
          success: true,

          group: result[0],
        });
      },
    );
  },
);

/*=========================================================
EXIT GROUP
=========================================================*/

router.delete(
  "/chat/group/:groupId/leave/:userId",

  (req, res) => {
    db.query(
      `

            DELETE

            FROM

                chat_group_members

            WHERE

                group_id=?

            AND

                user_id=?

            `,

      [req.params.groupId, req.params.userId],

      (err) => {
        if (err) {
          console.log(err);

          return res.json({
            success: false,

            message: "Không thể rời nhóm.",
          });
        }

        res.json({
          success: true,

          message: "Đã rời nhóm.",
        });
      },
    );
  },
);

/*=========================================================
DELETE GROUP
=========================================================*/

router.delete(
  "/chat/group/:groupId",

  (req, res) => {
    db.query(
      `

            UPDATE

                chat_groups

            SET

                is_deleted=1

            WHERE

                id=?

            `,

      [req.params.groupId],

      (err) => {
        if (err) {
          console.log(err);

          return res.json({
            success: false,

            message: "Không thể xóa nhóm.",
          });
        }

        res.json({
          success: true,

          message: "Đã xóa nhóm.",
        });
      },
    );
  },
);

/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
