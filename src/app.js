/*
 * @Author: ikouane
 * @Date: 2022-08-18 14:56:04
 * @LastEditTime: 2022-08-31 15:47:03
 * @LastEditors: ikouane
 * @Description:
 * @version:
 */
const http = require("http"),
  url = require("url"),
  path = require("path"),
  fs = require("fs"),
  mysql = require("mysql"),
  mime = require("mime");

// 数据库连接
const con = mysql.createConnection({
  host: "localhost",
  user: "test",
  password: "test123",
  database: "test",
});

const banPath = ["/403.html", "/404.html", "/410.html"];

const defaultPath = ["index.php", "index.html"];

con.connect();

function getExpireProjectPath() {
  let expirePathData = [];
  return new Promise((resolve, reject) => {
    con.query("SELECT * FROM `projects`", function (error, results, fields) {
      if (error) throw error;
      results.forEach(({ expireTime, status, path: pathname }) => {
        if (status && (!expireTime || expireTime > new Date())) {
          console.log("未过期");
        } else {
          expirePathData.push(path.join(__dirname, "../", "static", pathname));
        }
      });
      resolve(expirePathData);
    });
  });
}

getExpireProjectPath().then((expirePathArr) => {
  http
    .createServer(async (req, res) => {
      let { pathname } = url.parse(req.url);
      let staticPath = path.join(__dirname, "../", "static");
      let fileName = path.join(__dirname, "../", "static", pathname);

      if (req.method == "GET") {
        if (fileName.charAt(fileName.length - 1) == "\\") {
          fileName += "index.html";
        } else if (fileName.split("\\").reverse()[0].indexOf(".") == -1) {
          fileName += "\\index.html";
        }
      } else if (req.method == "POST") {
        if (fileName.charAt(fileName.length - 1) == "\\") {
          fileName += "index.php";
        } else if (fileName.split("\\").reverse()[0].indexOf(".") == -1) {
          fileName += "\\index.php";
        }
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Expires",
          new Date(new Date().getTime() + 1000 * 10).toGMTString()
        );
      }

      console.log(fileName);
      let expireFlag = false,
        notFoundFlag = false,
        data;
      expirePathArr.forEach((item) => {
        if (fileName.indexOf(item) == 0) {
          // 文件过期
          console.log(fileName, item);
          console.log("文件过期");
          expireFlag = true;
        } else {
        }
      });

      // 禁止直接访问黑名单中的文件，返回 404
      banPath.forEach((item) => {
        if (fileName.indexOf(item) == 0) {
          notFoundFlag = true;
        }
      });

      function returnErrorCode(code) {
        switch (code) {
          case 403:
          case 404:
          case 410:
            data = fs.readFileSync(
              path.join(staticPath, `${code}.html`),
              "utf-8"
            );
            res.setHeader("Content-Type", `text/html;charset=utf-8`);
            res.statusCode = code;
            res.end(data.replace("{{errorURL}}", fileName));
            break;

          default:
            break;
        }
      }

      if (expireFlag) {
        returnErrorCode(410);
      } else if (notFoundFlag) {
        returnErrorCode(404);
      } else {
        // 文件正常，准备读取文件并返回
        try {
          let mimeType = mime.getType(fileName);
          if (mimeType.indexOf("text") == -1) {
            data = fs.readFileSync(fileName);
            res.setHeader("Content-Type", `${mimeType};`);
          } else {
            data = fs.readFileSync(fileName, "utf-8");
            res.setHeader("Content-Type", `${mimeType};charset=utf-8`);
          }
          res.end(data);
        } catch (error) {
          returnErrorCode(404);
        }
      }
    })
    .listen(80);
  con.end();
});
