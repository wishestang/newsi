import { TopicsForm } from "@/components/topics/topics-form";

export default function TopicsPage() {
  async function saveTopics(_formData: FormData) {
    "use server";
  }

  return <TopicsForm initialValue="" onSubmitAction={saveTopics} />;
}
