const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const DID_API_KEY = process.env.DID_API_KEY;
    const AGENT_ID = process.env.AGENT_ID || 'v2_agt_UcvqQ_-y';

    if (!DID_API_KEY) {
      throw new Error('DID_API_KEY 환경변수가 설정되지 않았습니다');
    }

    const { studentName, question, answer, isCorrect } = JSON.parse(event.body);
    const timestamp = new Date().toLocaleString('ko-KR');
    
    const createKnowledgeResponse = await fetch('https://api.d-id.com/knowledge', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `퀴즈답변_${studentName}_${Date.now()}`,
        description: `${studentName}님의 스텝레더 운동 퀴즈 답변 기록`
      })
    });

    if (!createKnowledgeResponse.ok) {
      const errorText = await createKnowledgeResponse.text();
      throw new Error(`Knowledge Base 생성 실패: ${errorText}`);
    }

    const knowledge = await createKnowledgeResponse.json();
    const knowledgeId = knowledge.id;

    const knowledgeContent = `
지식제목: 퀴즈 답변 기록 - ${studentName}
답변일시: ${timestamp}

답변자 정보:
- 이름: ${studentName}

퀴즈 정보:
- 문제: ${question}
- 선택한 답: ${answer}
- 정답 여부: ${isCorrect ? '정답 ✓' : '오답 ✗'}

해설:
이중과제 운동은 일상생활에서 걷기와 대화하기, 걷기와 물건 들기 등 
여러 과제를 동시에 처리해야 하는 상황에 대비하는 훈련입니다. 
스텝레더 운동에 청각 자극(호각 소리)을 추가하여 
주의력, 기억력, 반응속도를 함께 향상시킬 수 있습니다.

학습 성과:
${isCorrect ? '- 이중과제의 개념을 정확히 이해했습니다.' : '- 이중과제의 개념을 복습하면 좋겠습니다.'}
${isCorrect ? '- 노인 운동 프로그램의 핵심 원리를 파악했습니다.' : '- 노인 운동 프로그램의 핵심 원리를 다시 학습하세요.'}
    `.trim();

    const form = new FormData();
    form.append('file', Buffer.from(knowledgeContent), {
      filename: 'quiz_answer.txt',
      contentType: 'text/plain'
    });
    form.append('documentType', 'text');
    form.append('title', `${studentName}_답변`);

    const addDocumentResponse = await fetch(
      `https://api.d-id.com/knowledge/${knowledgeId}/documents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${DID_API_KEY}`,
          ...form.getHeaders()
        },
        body: form
      }
    );

    if (!addDocumentResponse.ok) {
      const errorText = await addDocumentResponse.text();
      throw new Error(`문서 추가 실패: ${errorText}`);
    }

    const updateAgentResponse = await fetch(
      `https://api.d-id.com/agents/${AGENT_ID}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Basic ${DID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          knowledge: { id: knowledgeId }
        })
      }
    );

    if (!updateAgentResponse.ok) {
      const errorText = await updateAgentResponse.text();
      throw new Error(`Agent 업데이트 실패: ${errorText}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '답변이 성공적으로 저장되었습니다!',
        knowledgeId: knowledgeId
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
