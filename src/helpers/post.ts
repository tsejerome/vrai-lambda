import { mongodb, initDB } from '../model/mongodb';
import PromptHelper from './prompt';

interface CreatePostArgs {
  userId: string;
  transcriptionResult: string;
  summarizationType: string;
  audioUrl?: string;
  domain?: string;
}

export const createPostWithSummary = async (args: CreatePostArgs) => {
  try {
    await initDB();

    const summary = await PromptHelper.getSummary({
      userId: args.userId,
      promptId: args.summarizationType,
      recordedContent: args.transcriptionResult,
      domain: args.summarizationType === 'summarizev2' ? 'whatsapp.com' : args.domain
    });

    // const title = await PromptHelper.getSummary({
    //   userId: args.userId,
    //   promptId: 'title',
    //   recordedContent: args.transcriptionResult
    // });

    const postData = {
      title: `Random Title ${new Date().toUTCString()}`,
      userId: args.userId,
      audioUrl: args.audioUrl || null,
      transcriptionResult: args.transcriptionResult,
      summarizedContent: summary.cleanResponse,
      finalContent: summary.cleanResponse,
      public: false,
      transcriptionId: null,
      tags: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
      isDeleted: false
    };

    const result = await mongodb!.collection('Post').insertOne(postData);

    return {
      ...postData,
      id: result.insertedId,
      summary: summary.cleanResponse
    };
  } catch (error) {
    console.error('Error creating post with summary:', error);
    throw error;
  }
};
