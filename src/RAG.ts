// ============================================
// RAG (Retrieval-Augmented Generation) POC
// Functional TypeScript with Interfaces
// ============================================

// Types & Interfaces
interface Document {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

interface EmbeddingModel {
  embed: (text: string) => Promise<number[]>;
}

interface VectorStore {
  add: (doc: Document) => Promise<void>;
  search: (query: number[], topK: number) => Promise<Document[]>;
}

interface RAGContext {
  query: string;
  retrievedDocs: Document[];
  relevanceScores: number[];
}

interface RAGResult {
  context: RAGContext;
  prompt: string;
}

// ============================================
// Embedding Functions (Simulated)
// ============================================

// Simple cosine similarity for vector comparison
const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Simulated embedding function (in production, use OpenAI/Anthropic API)
const createMockEmbedding = (text: string): number[] => {
  // Simple hash-based embedding for demo
  // In production: call OpenAI embeddings API or similar
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  // Generate 384-dimensional vector (common embedding size)
  const embedding: number[] = [];
  for (let i = 0; i < 384; i++) {
    embedding.push(Math.sin(hash + i) * Math.cos(hash - i));
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
};

const createEmbeddingModel = (): EmbeddingModel => ({
  embed: async (text: string) => {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 100));
    return createMockEmbedding(text);
  }
});

// ============================================
// Vector Store (In-Memory)
// ============================================

const createVectorStore = (): VectorStore => {
  const documents: Document[] = [];

  return {
    add: async (doc: Document) => {
      documents.push(doc);
    },

    search: async (queryEmbedding: number[], topK: number) => {
      // Calculate similarity scores for all documents
      const scored = documents
        .filter(doc => doc.embedding)
        .map(doc => ({
          doc,
          score: cosineSimilarity(queryEmbedding, doc.embedding!)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return scored.map(item => item.doc);
    }
  };
};

// ============================================
// RAG Pipeline Functions
// ============================================

// Index documents into the vector store
const indexDocuments = async (
  docs: Omit<Document, 'embedding'>[],
  embeddingModel: EmbeddingModel,
  vectorStore: VectorStore
): Promise<void> => {
  for (const doc of docs) {
    const embedding = await embeddingModel.embed(doc.content);
    await vectorStore.add({ ...doc, embedding });
  }
};

// Retrieve relevant documents for a query
const retrieveContext = async (
  query: string,
  embeddingModel: EmbeddingModel,
  vectorStore: VectorStore,
  topK: number = 3
): Promise<RAGContext> => {
  const queryEmbedding = await embeddingModel.embed(query);
  const retrievedDocs = await vectorStore.search(queryEmbedding, topK);
  
  // Calculate relevance scores
  const relevanceScores = retrievedDocs.map(doc => 
    cosineSimilarity(queryEmbedding, doc.embedding!)
  );

  return {
    query,
    retrievedDocs,
    relevanceScores
  };
};

// Generate augmented prompt with retrieved context
const augmentPrompt = (
  query: string,
  context: RAGContext
): string => {
  const contextText = context.retrievedDocs
    .map((doc, i) => {
      const score = (context.relevanceScores[i] * 100).toFixed(1);
      return `[Document ${i + 1}] (Relevance: ${score}%)
${doc.content}
---`;
    })
    .join('\n\n');

  return `You are an AI assistant. Answer the question based on the provided context.

CONTEXT:
${contextText}

QUESTION: ${query}

ANSWER: Please provide a detailed answer based on the context above.`;
};

// Complete RAG pipeline
const performRAG = async (
  query: string,
  embeddingModel: EmbeddingModel,
  vectorStore: VectorStore,
  topK: number = 3
): Promise<RAGResult> => {
  const context = await retrieveContext(query, embeddingModel, vectorStore, topK);
  const prompt = augmentPrompt(query, context);

  return { context, prompt };
};

// ============================================
// Example Usage
// ============================================

const runRAGExample = async (): Promise<void> => {
  console.log('🚀 RAG System POC - Starting...\n');

  // 1. Create components
  const embeddingModel = createEmbeddingModel();
  const vectorStore = createVectorStore();

  // 2. Sample knowledge base (your company docs, policies, etc.)
  const knowledgeBase: Omit<Document, 'embedding'>[] = [
    {
      id: 'doc1',
      content: 'Our refund policy: Customers can request refunds within 30 days of purchase. Refunds are processed within 5-7 business days to the original payment method.',
      metadata: { source: 'policies', category: 'refunds' }
    },
    {
      id: 'doc2',
      content: 'Shipping information: We offer free shipping on orders over $50. Standard shipping takes 3-5 business days. Express shipping is available for an additional fee.',
      metadata: { source: 'policies', category: 'shipping' }
    },
    {
      id: 'doc3',
      content: 'Technical support: Our support team is available Monday-Friday, 9 AM to 5 PM EST. For urgent issues, use our 24/7 chat support. Average response time is under 2 hours.',
      metadata: { source: 'policies', category: 'support' }
    },
    {
      id: 'doc4',
      content: 'Product warranty: All products come with a 1-year manufacturer warranty. Extended warranties are available for purchase. Warranty claims can be submitted through our online portal.',
      metadata: { source: 'policies', category: 'warranty' }
    },
    {
      id: 'doc5',
      content: 'Account security: We recommend enabling two-factor authentication. Password requirements: minimum 12 characters with uppercase, lowercase, and numbers. Sessions expire after 30 days of inactivity.',
      metadata: { source: 'policies', category: 'security' }
    }
  ];

  // 3. Index documents
  console.log('📚 Indexing knowledge base...');
  await indexDocuments(knowledgeBase, embeddingModel, vectorStore);
  console.log(`✅ Indexed ${knowledgeBase.length} documents\n`);

  // 4. Perform RAG queries
  const queries = [
    'How long does shipping take?',
    'What is your refund policy?',
    'How can I contact support?'
  ];

  for (const query of queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Query: "${query}"`);
    console.log('='.repeat(60));

    const result = await performRAG(query, embeddingModel, vectorStore, 2);

    console.log('\n📄 Retrieved Documents:');
    result.context.retrievedDocs.forEach((doc, i) => {
      const score = (result.context.relevanceScores[i] * 100).toFixed(1);
      console.log(`\n[${i + 1}] ${doc.id} (${score}% relevant)`);
      console.log(`    ${doc.content.substring(0, 80)}...`);
    });

    console.log('\n💬 Generated Prompt (first 200 chars):');
    console.log(result.prompt.substring(0, 200) + '...\n');
  }

  console.log('\n✨ RAG POC Complete!');
};

// ============================================
// Production Integration Tips
// ============================================

/*
PRODUCTION IMPLEMENTATION:

1. Replace Mock Embeddings:
   - Use OpenAI: https://platform.openai.com/docs/guides/embeddings
   - Use Anthropic Claude with voyageai
   - Or use sentence-transformers for local embeddings

2. Use Real Vector Database:
   - Pinecone: https://www.pinecone.io/
   - Weaviate: https://weaviate.io/
   - Qdrant: https://qdrant.tech/
   - Chroma: https://www.trychroma.com/

3. Example with OpenAI:

   import OpenAI from 'openai';
   
   const createOpenAIEmbedding = (apiKey: string): EmbeddingModel => ({
     embed: async (text: string) => {
       const client = new OpenAI({ apiKey });
       const response = await client.embeddings.create({
         model: "text-embedding-3-small",
         input: text,
       });
       return response.data[0].embedding;
     }
   });

4. Chunking Strategy:
   - Split large documents into smaller chunks (500-1000 tokens)
   - Maintain overlap between chunks for context
   - Store chunk metadata (source doc, position, etc.)

5. Hybrid Search:
   - Combine vector search with keyword search (BM25)
   - Re-rank results using cross-encoders
   - Filter by metadata before vector search

6. Caching:
   - Cache embeddings to avoid re-computing
   - Cache frequently accessed documents
   - Use Redis for fast retrieval

7. Monitoring:
   - Track retrieval quality (precision/recall)
   - Monitor relevance scores distribution
   - Log queries with no good matches
*/

// Run the example
runRAGExample().catch(console.error);

export type {
  Document,
  EmbeddingModel,
  VectorStore,
  RAGContext,
  RAGResult
};

export {
  createEmbeddingModel,
  createVectorStore,
  indexDocuments,
  retrieveContext,
  augmentPrompt,
  performRAG,
  cosineSimilarity
};
