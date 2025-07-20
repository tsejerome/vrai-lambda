import OpenAI from 'openai';
import { mongodb, initDB } from '../model/mongodb';
import { seedPromptTemplates, PromptTemplate } from './promptTemplateSeeder';

interface IPromptHelper {
  formatPromptMessage(template: string, recordedContent: string, domain?: string): string;
  getPromptTemplate(promptId: string): Promise<PromptTemplate | null>;
  getSummary(args: { promptId: string, userId: string, recordedContent: string, domain?: string }): Promise<any>;
  createPrompt(args: { userId: string, recordedContent: string, input: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, output: OpenAI.Chat.Completions.ChatCompletion, template: PromptTemplate }): Promise<any>
}

const openai = new OpenAI({
  apiKey: process.env.openai_secret,
});

let templatesInitialized = false;

const ensureTemplatesInitialized = async (): Promise<void> => {
  if (!templatesInitialized) {
    await seedPromptTemplates();
    templatesInitialized = true;
  }
};

const PromptHelper: IPromptHelper = {
  formatPromptMessage: function (template, recordedContent, domain) {
    let res = template.replace(/{{recordedContent}}/g, recordedContent);
    return domain ? res.replace(/{{domain}}/g, domain) : res.replace(/{{domain}}/g, 'a professional manner');
  },

  getPromptTemplate: async function (promptId: string): Promise<PromptTemplate | null> {
    try {
      await initDB();
      await ensureTemplatesInitialized();
      
      const template = await mongodb!.collection('promptTemplates').findOne({
        templateId: promptId
      });
      
      return template as PromptTemplate | null;
    } catch (error) {
      console.error('Error fetching prompt template:', error);
      return null;
    }
  },

  getSummary: async function ({ promptId, userId, recordedContent, domain }) {
    try {
      const templateDoc = await this.getPromptTemplate(promptId);
      
      const fallbackTemplate = templateDoc || await this.getPromptTemplate('simple-cleanup');
      
      if (!fallbackTemplate) {
        throw new Error(`Template not found: ${promptId} and fallback failed`);
      }
      
      const template = fallbackTemplate.template;
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
      return await this.createPrompt({ userId, recordedContent, input, output, template: fallbackTemplate });

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
      template: template.template,
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
