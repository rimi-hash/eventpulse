import { apiClient } from './apiClient';
import { AssistantChatRequest, AssistantChatResponse, ToolDefinition } from '../types/assistant';
import { ApiResponse } from '../types/api';

export const assistantService = {
  /**
   * Dispatches a recognized natural-language voice or text command to the backend
   * along with rich application context for execution against verified domain services.
   */
  async sendCommand(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const res = await apiClient.post<AssistantChatResponse>('/assistant/chat', request);
    return res.data;
  },

  /**
   * Retrieves supported assistant intents allowlist for client introspection.
   */
  async getSupportedIntents(): Promise<ApiResponse<Array<{ name: string; isTransactional: boolean; requiresAuth: boolean }>>> {
    return apiClient.get('/assistant/intents');
  },

  /**
   * Retrieves verified capability tools registry with parameter schemas and permission tiers.
   */
  async getCapabilityRegistry(): Promise<ApiResponse<ToolDefinition[]>> {
    return apiClient.get('/assistant/tools');
  },
};
