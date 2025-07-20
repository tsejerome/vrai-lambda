import OpenAI from 'openai';
import { mongodb, initDB } from '../model/mongodb';

interface IPromptHelper {
  formatPromptMessage(template: string, recordedContent: string, domain?: string): string;
  getSummary(args: { promptId: string, userId: string, recordedContent: string, domain?: string }): Promise<any>;
  createPrompt(args: { userId: string, recordedContent: string, input: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, output: OpenAI.Chat.Completions.ChatCompletion, template: string }): Promise<any>
}

const openai = new OpenAI({
  apiKey: process.env.openai_secret,
});

const PROMPT_TEMPLATES: { [key: string]: string } = {
  'simple-cleanup': `Clean up and format the following transcribed content. Remove filler words, fix grammar, and improve readability while maintaining the original meaning and tone. Present only the content itself without introductory phrases or any other extra summary statements like "The speaker discusses" or "Here's the summary." Ensure the result is in the original detected language, including specific variations where applicable, unless specified above.

Transcribed audio: '''{{recordedContent}}'''`,

  'title': `Generate a concise, descriptive title (maximum 8 words) for the following transcribed content. The title should capture the main topic or purpose. Present only the title without any introductory phrases or explanations.

Transcribed audio: '''{{recordedContent}}'''`,

  'whatsapp-cleanup': `Clean up and format the following transcribed content for WhatsApp messaging. Apply these WhatsApp-specific formatting rules:
- Use \`\`\`text\`\`\` for code snippets
- Use ~text~ for strikethrough text
- Use *text* for bold emphasis
- Use _text_ for italic emphasis
- Use numbered lists (1. 2. 3.) for ordered items
- Use bullet points (•) for unordered lists
- Keep the content conversational and suitable for {{domain}} messaging
- Remove filler words and clean up grammar while maintaining the original meaning
- Present only the formatted content without introductory phrases

Transcribed audio: '''{{recordedContent}}'''`
};

const PromptHelper: IPromptHelper = {
  formatPromptMessage: function (template, recordedContent, domain) {
    let res = template.replace(/{{recordedContent}}/g, recordedContent);
    return domain ? res.replace(/{{domain}}/g, domain) : res.replace(/{{domain}}/g, 'a professional manner');
  },

  getSummary: async function ({ promptId, userId, recordedContent, domain }) {
    try {
      const template = PROMPT_TEMPLATES[promptId] || PROMPT_TEMPLATES['simple-cleanup'];
      const msgContent = this.formatPromptMessage(template, recordedContent.trim(), domain);
      
      const input: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        'model': 'gpt-4o',
        'messages': [
          {
            'role': 'assistant',
            'content': 'You are a note taking assistant which helps users to take note'
          },
          {
            'role': 'user',
            'content': msgContent
          }
        ],
        'stop': '}',
        'temperature': 0.5,
        'frequency_penalty': 1,
        'max_tokens': 4096,
        'n': 1
      };

      console.log('Prompt content:', msgContent);
      const output = await openai.chat.completions.create(input);
      return await this.createPrompt({ userId, recordedContent, input, output, template });

    } catch (err) {
      console.error('Error in getSummary:', err);
      throw err;
    }
  },

  createPrompt: async function ({ userId, recordedContent, input, output, template }) {
    await initDB();
    
    const promptData = {
      userId,
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      template: template,
      textSource: recordedContent,
      cleanResponse: output.choices[0].message.content,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    const result = await mongodb!.collection('prompts').insertOne(promptData);
    return {
      ...promptData,
      id: result.insertedId,
      cleanResponse: output.choices[0].message.content
    };
  }
};

export default PromptHelper;
