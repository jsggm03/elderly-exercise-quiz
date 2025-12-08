const fetch = require("node-fetch");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // 1) 퀴즈 데이터 받기
    const { studentName, question, answer, isCorrect } = JSON.parse(event.body);

    if (!studentName || !question || !answer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Missing fields" }),
      };
    }

    const timestamp = new Date().toISOString();
    const fileContent = `
학생: ${studentName}
문제: ${question}
답변: ${answer}
정답 여부: ${isCorrect}
시간: ${timestamp}
    `.trim();

    // 2) GitHub 업로드 준비
    const REPO = "ai-agent-knowledge";
    const OWNER = "jsggm03";
    const FILE_NAME = `quiz_${studentName}_${Date.now()}.txt`;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const contentEncoded = Buffer.from(fileContent).toString("base64");

    // 3) GitHub에 파일 업로드
    const githubRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_NAME}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Add quiz answer from ${studentName}`,
          content: contentEncoded,
        }),
      }
    );

    if (!githubRes.ok) {
      const err = await githubRes.text();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "GitHub upload failed", detail: err }),
      };
    }

    // GitHub raw URL
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${FILE_NAME}`;

    // 4) D-ID Agent로 문서 업로드
    const DID_API_KEY = process.env.DID_API_KEY;
    const AGENT_ID = process.env.AGENT_ID;

    const didRes = await fetch(
      `https://api.d-id.com/v2/agents/${AGENT_ID}/documents`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: rawUrl,
          documentType: "text",
          title: `${studentName}의 퀴즈 제출`,
        }),
      }
    );

    const didJson = await didRes.json();

    if (!didRes.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: "D-ID Upload Failed",
          detail: didJson,
        }),
      };
    }

    // 최종 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        github_url: rawUrl,
        did_response: didJson,
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
