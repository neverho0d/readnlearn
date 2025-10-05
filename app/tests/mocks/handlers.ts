import { http, HttpResponse } from 'msw'

export const handlers = [
  // OpenAI API mocks
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              story: 'Test story with phrases',
              usedPhrases: ['test phrase'],
              glosses: [{ term: 'test', hint: 'example' }]
            })
          }
        }
      ]
    })
  }),

  // DeepL API mocks
  http.post('https://api-free.deepl.com/v2/translate', () => {
    return HttpResponse.json({
      translations: [{ text: 'Test translation' }]
    })
  }),
]
