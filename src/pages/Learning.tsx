import { useParams } from "react-router-dom";
import { LearningHub } from "@/components/learning/LearningHub";
import { GuidePage } from "@/components/learning/GuidePage";

/** /learning (hub) and /learning/:slug (a single guide). */
export default function Learning() {
  const { slug } = useParams<{ slug: string }>();
  return slug ? <GuidePage slug={slug} /> : <LearningHub />;
}
