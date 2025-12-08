exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    const { studentName, question, answer, isCorrect } = data;

    if (!studentName || !question || !answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing fields" })
      };
    }

    // 여기서는 GitHub 저장 예시
    const fs = require("fs");
    const path = require("path");

    const filename = path.join("/tmp", `${studentName}.txt`);
    const content =
      `Name: ${studentName}\nQuestion: ${question}\nAnswer: ${answer}\nCorrect: ${isCorrect}\n\n`;

    fs.appendFileSync(filename, content);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
