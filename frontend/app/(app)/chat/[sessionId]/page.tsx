import { ChatView } from "@/components/chat/chat-view";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <ChatView sessionId={sessionId} />;
}
