const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const DID_API_KEY = process.env.DID_API_KEY;
  const AGENT_ID = process.env.AGENT_ID;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_USERNAME = "jsggm03";
  const REPO_NAME = "ai-agent-knowledge";

  const { studentName, question, answer, isCorrect } = JSON.parse(event.body);
  const timestamp = new Date().toLocaleString("ko-KR");

  const explanation = `
경도인지장애(MCI)의 조기 발견은 완치가 목적이 아니라,
✔ 증상 진행을 늦추고  
✔ 삶의 질을 유지하며 관리하는 것이 핵심입니다.
  `.trim();

  const knowledgeContent = `
지식제목: 퀴즈 답변 기록 - ${studentName}
답변일시: ${timestamp}
답변자: ${studentName}

문제:
${question}

선택한 답:
${answer}

정답 여부:
${isCorrect ? "정답" : "오답"}

해설:
${explanation}
  `.trim();

  const fileName = `quiz_${studentName}_${Date.now()}.txt`;
  const fileContentBase64 = Buffer.from(knowledgeContent, "utf-8").toString("base64");

  // 1️⃣ GitHub 저장
  await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${fileName}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json"
    },
    body: JSON.stringify({
      message: `Add quiz answer: ${studentName}`,
      content: fileContentBase64
    })
  });

  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}_
