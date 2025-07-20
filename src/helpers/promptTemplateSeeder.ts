import { mongodb, initDB } from '../model/mongodb';

interface PromptTemplate {
  templateId: string;
  template: string;
  name: string;
  description?: string;
  userId: string;
  isOfficial: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    templateId: 'simple-cleanup',
    name: 'Simple Cleanup',
    description: 'Clean up and format transcribed content, removing filler words and improving readability',
    template: `Clean up and format the following transcribed content. Remove filler words, fix grammar, and improve readability while maintaining the original meaning and tone. Present only the content itself without introductory phrases or any other extra summary statements like "The speaker discusses" or "Here's the summary." Ensure the result is in the original detected language, including specific variations where applicable, unless specified above.

Transcribed audio: '''{{recordedContent}}'''`,
    userId: 'system',
    isOfficial: true,
    tags: ['cleanup', 'default'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    templateId: 'title',
    name: 'Title Generation',
    description: 'Generate concise, descriptive titles for transcribed content',
    template: `Generate a concise, descriptive title (maximum 8 words) for the following transcribed content. The title should capture the main topic or purpose. Present only the title without any introductory phrases or explanations.

Transcribed audio: '''{{recordedContent}}'''`,
    userId: 'system',
    isOfficial: true,
    tags: ['title', 'default'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    templateId: 'whatsapp-cleanup',
    name: 'WhatsApp Cleanup',
    description: 'Format content specifically for WhatsApp messaging with proper syntax',
    template: `Clean up and format the following transcribed content for WhatsApp messaging. Apply these WhatsApp-specific formatting rules:
- Use \`\`\`text\`\`\` for code snippets
- Use ~text~ for strikethrough text
- Use *text* for bold emphasis
- Use _text_ for italic emphasis
- Use numbered lists (1. 2. 3.) for ordered items
- Use bullet points (•) for unordered lists
- Keep the content conversational and suitable for {{domain}} messaging
- Remove filler words and clean up grammar while maintaining the original meaning
- Present only the formatted content without introductory phrases

Transcribed audio: '''{{recordedContent}}'''`,
    userId: 'system',
    isOfficial: true,
    tags: ['whatsapp', 'messaging', 'formatting'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const seedPromptTemplates = async (): Promise<void> => {
  try {
    await initDB();
    
    for (const template of DEFAULT_TEMPLATES) {
      await mongodb!.collection('promptTemplates').updateOne(
        { templateId: template.templateId },
        { $setOnInsert: template },
        { upsert: true }
      );
    }
    
    console.log('Prompt templates seeded successfully');
  } catch (error) {
    console.error('Error seeding prompt templates:', error);
    throw error;
  }
};

export { PromptTemplate };
