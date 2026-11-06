import type { ChatMessageDto } from "@fitmusc/shared/api/dto";
import { limitQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { clearChatHistory, getChatHistory } from "@/actions/chat";

export const GET = apiRoute(
  { input: limitQuery },
  ({ input }): Promise<JsonSource<ChatMessageDto>[]> => getChatHistory(input.limit),
);

export const DELETE = apiRoute({}, () => clearChatHistory());
