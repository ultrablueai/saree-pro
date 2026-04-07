// Gemini AI Integration for Saree Pro
// Provides intelligent features like smart search, menu optimization, and analytics

export interface GeminiAIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AISuggestion {
  id: string;
  type: 'menu' | 'description' | 'pricing' | 'analytics' | 'search';
  title: string;
  content: string;
  confidence: number;
  reasoning: string;
}

export interface MenuOptimizationResult {
  suggestions: AISuggestion[];
  optimizedItems: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    aiOptimized: boolean;
  }>;
  insights: string[];
  potentialRevenueIncrease: number;
}

export interface SalesAnalysisResult {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }>;
  trends: Array<{
    period: string;
    revenue: number;
    orders: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recommendations: AISuggestion[];
  predictions: Array<{
    metric: string;
    value: number;
    confidence: number;
    timeframe: string;
  }>;
}

export interface SmartSearchResult {
  query: string;
  results: Array<{
    id: string;
    type: 'menu_item' | 'merchant' | 'category';
    title: string;
    description: string;
    relevanceScore: number;
    metadata?: Record<string, any>;
  }>;
  suggestions: string[];
  correctedQuery?: string;
}

export interface DriverAssistanceResult {
  route: {
    waypoints: Array<{
      lat: number;
      lng: number;
      instruction: string;
      estimatedTime: number;
    }>;
    totalDistance: number;
    totalTime: number;
    trafficInfo: string;
  };
  tips: string[];
  etaUpdates: Array<{
    time: string;
    eta: number;
    reason: string;
  }>;
}

export class GeminiAIService {
  private config: GeminiAIConfig;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiAIConfig) {
    this.config = {
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 1024,
      ...config,
    };
  }

  /**
   * Generate AI-powered menu suggestions
   */
  async optimizeMenu(
    merchantId: string,
    currentMenu: any[],
    salesData: any[]
  ): Promise<MenuOptimizationResult> {
    const prompt = `
      As a restaurant AI consultant, analyze the following menu and sales data to provide optimization suggestions:

      Current Menu:
      ${JSON.stringify(currentMenu, null, 2)}

      Recent Sales Data:
      ${JSON.stringify(salesData, null, 2)}

      Please provide:
      1. Menu item optimizations (pricing, descriptions, categories)
      2. New item suggestions based on trends
      3. Menu structure improvements
      4. Revenue optimization strategies
      5. Customer preference insights

      Format as JSON with suggestions, optimizedItems, insights, and potentialRevenueIncrease.
    `;

    const response = await this.callGemini(prompt);
    return this.parseMenuOptimization(response);
  }

  /**
   * Generate product descriptions using AI
   */
  async generateDescription(
    productName: string,
    ingredients: string[],
    cuisineType: string,
    targetAudience: string = 'general'
  ): Promise<string> {
    const prompt = `
      Create an appealing, mouth-watering description for a food item with the following details:
      
      Product Name: ${productName}
      Ingredients: ${ingredients.join(', ')}
      Cuisine Type: ${cuisineType}
      Target Audience: ${targetAudience}

      Requirements:
      - Maximum 150 characters
      - Include sensory details (taste, smell, texture)
      - Highlight key ingredients
      - Create emotional appeal
      - Include 2-3 relevant emojis
      - Make it sound authentic and delicious

      Return only the description, no additional text.
    `;

    const response = await this.callGemini(prompt);
    return response.trim();
  }

  /**
   * Analyze sales data and provide insights
   */
  async analyzeSales(
    merchantId: string,
    timeRange: string,
    salesData: any[]
  ): Promise<SalesAnalysisResult> {
    const prompt = `
      As a business intelligence analyst, analyze this restaurant's sales data and provide comprehensive insights:

      Time Range: ${timeRange}
      Sales Data:
      ${JSON.stringify(salesData, null, 2)}

      Please analyze and provide:
      1. Key performance metrics (revenue, orders, AOV)
      2. Top performing items
      3. Sales trends and patterns
      4. Customer behavior insights
      5. Actionable recommendations
      6. Future predictions for next 30 days

      Format as structured JSON with all the required fields.
    `;

    const response = await this.callGemini(prompt);
    return this.parseSalesAnalysis(response);
  }

  /**
   * Perform intelligent search across menu items and merchants
   */
  async smartSearch(
    query: string,
    filters?: {
      cuisine?: string;
      priceRange?: [number, number];
      location?: string;
      dietary?: string[];
    }
  ): Promise<SmartSearchResult> {
    const filterText = filters ? `
      Filters:
      - Cuisine: ${filters.cuisine || 'any'}
      - Price Range: ${filters.priceRange ? `$${filters.priceRange[0]} - $${filters.priceRange[1]}` : 'any'}
      - Location: ${filters.location || 'any'}
      - Dietary: ${filters.dietary?.join(', ') || 'none'}
    ` : '';

    const prompt = `
      Perform an intelligent search for food items based on this query:
      Query: "${query}"
      ${filterText}

      Please provide:
      1. Most relevant search results (menu items, merchants, categories)
      2. Search suggestions if query is ambiguous
      3. Corrected query if spelling is detected
      4. Relevance scores for each result

      Consider:
      - Semantic meaning and intent
      - Food relationships and similarities
      - Common typos and variations
      - Local food terminology
      - User preferences and context

      Format as JSON with results array, suggestions array, and correctedQuery if applicable.
    `;

    const response = await this.callGemini(prompt);
    return this.parseSmartSearch(response, query);
  }

  /**
   * Provide real-time driver assistance
   */
  async getDriverAssistance(
    driverLocation: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    currentOrders: any[],
    trafficData: any
  ): Promise<DriverAssistanceResult> {
    const prompt = `
      As an experienced delivery driver assistant, provide optimal routing and assistance for:

      Driver Location: ${JSON.stringify(driverLocation)}
      Destination: ${JSON.stringify(destination)}
      Current Orders: ${JSON.stringify(currentOrders)}
      Traffic Data: ${JSON.stringify(trafficData)}

      Please provide:
      1. Optimal route with waypoints and instructions
      2. Real-time traffic considerations
      3. Delivery time estimates
      4. Pro tips for efficient delivery
      5. ETA updates based on conditions
      6. Contingency plans for delays

      Consider:
      - Traffic patterns and congestion
      - Order priorities and time windows
      - Weather conditions
      - Optimal pickup/dropoff sequences
      - Customer satisfaction factors

      Format as structured JSON with route, tips, and etaUpdates.
    `;

    const response = await this.callGemini(prompt);
    return this.parseDriverAssistance(response);
  }

  /**
   * Generate strategic business reports
   */
  async generateStrategicReport(
    merchantId: string,
    reportType: 'weekly' | 'monthly' | 'quarterly',
    data: any
  ): Promise<any> {
    const prompt = `
      Generate a comprehensive strategic business report for a restaurant:

      Report Type: ${reportType}
      Merchant ID: ${merchantId}
      Data: ${JSON.stringify(data, null, 2)}

      Include sections for:
      1. Executive Summary
      2. Financial Performance
      3. Operational Efficiency
      4. Customer Satisfaction
      5. Market Position
      6. Competitive Analysis
      7. Growth Opportunities
      8. Risk Assessment
      9. Strategic Recommendations
      10. Action Plan with KPIs

      Make it professional, data-driven, and actionable. Include charts and visualizations suggestions.
    `;

    return this.callGemini(prompt);
  }

  /**
   * Translate and localize content
   */
  async translateContent(
    content: string,
    targetLanguage: string,
    context: 'menu' | 'marketing' | 'customer_service' = 'menu'
  ): Promise<string> {
    const prompt = `
      Translate the following content to ${targetLanguage} for a ${context} context:

      Content: "${content}"

      Requirements:
      - Maintain the original tone and intent
      - Use culturally appropriate terminology
      - Consider local food preferences and naming conventions
      - Preserve any technical accuracy
      - Make it sound natural to native speakers
      - For food items, use common local names when appropriate

      Return only the translated content.
    `;

    return this.callGemini(prompt);
  }

  /**
   * Make API call to Gemini
   */
  private async callGemini(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: this.config.temperature,
              maxOutputTokens: this.config.maxTokens,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse menu optimization response
   */
  private parseMenuOptimization(response: string): MenuOptimizationResult {
    try {
      return JSON.parse(response);
    } catch {
      // Fallback parsing
      return {
        suggestions: [],
        optimizedItems: [],
        insights: ['AI analysis temporarily unavailable'],
        potentialRevenueIncrease: 0,
      };
    }
  }

  /**
   * Parse sales analysis response
   */
  private parseSalesAnalysis(response: string): SalesAnalysisResult {
    try {
      return JSON.parse(response);
    } catch {
      // Fallback parsing
      return {
        period: 'unknown',
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topItems: [],
        trends: [],
        recommendations: [],
        predictions: [],
      };
    }
  }

  /**
   * Parse smart search response
   */
  private parseSmartSearch(response: string, originalQuery: string): SmartSearchResult {
    try {
      return JSON.parse(response);
    } catch {
      // Fallback parsing
      return {
        query: originalQuery,
        results: [],
        suggestions: [],
      };
    }
  }

  /**
   * Parse driver assistance response
   */
  private parseDriverAssistance(response: string): DriverAssistanceResult {
    try {
      return JSON.parse(response);
    } catch {
      // Fallback parsing
      return {
        route: {
          waypoints: [],
          totalDistance: 0,
          totalTime: 0,
          trafficInfo: 'Unable to analyze traffic',
        },
        tips: ['Drive safely and follow traffic laws'],
        etaUpdates: [],
      };
    }
  }
}

// Singleton instance
let geminiAIService: GeminiAIService | null = null;

export function getGeminiAIService(): GeminiAIService {
  if (!geminiAIService) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found in environment variables');
    }
    
    geminiAIService = new GeminiAIService({ apiKey });
  }
  
  return geminiAIService;
}

// Utility functions
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`;
}
