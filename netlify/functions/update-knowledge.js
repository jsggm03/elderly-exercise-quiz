const fetch = require("node-fetch");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // OPTIONS 프리플라이트 처리
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { studentName, question, answer, isCorrect } = JSON.parse(event.body);

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = "jsggm03";
    const REPO_NAME = "ai-agent-knowledge";

    const DID_API_KEY = process.env.DID_API_KEY;
    const AGENT_ID = process.env.AGENT_ID;

    const timestamp = new Date().toISOString();

    const content = `
학생: ${studentName}
문제: ${question}
답변: ${answer}
정답 여부: ${isCorrect}
시간: ${timestamp}
    `.trim();

    const fileName = `quiz_${studentName}_${Date.now()}.txt`;
    const contentBase64 = Buffer.from(content).toString("base64");

    // ============================
    // 1) GitHub 저장
    // ============================
    await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${fileName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Add quiz answer from ${studentName}`,
          content: contentBase64,
        }),
      }
    );

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${fileName}`;

    // ============================
    // 2) D-ID 지식 업데이트
    // ============================
    const didRes = await fetch(
      `https://api.d-id.com/agents/${AGENT_ID}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DID_API_KEY}`, // ★ 수정: Basic → Bearer
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: rawUrl,
          documentType: "text",
          title: `${studentName} 퀴즈 제출`,
        }),
      }
    );

    const didJson = await didRes.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        github_url: rawUrl,
        did_result: didJson,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
