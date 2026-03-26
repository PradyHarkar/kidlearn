import { v4 as uuidv4 } from "uuid";
import { putItem, TABLES } from "@/lib/dynamodb";
import type { QuestionIssue, ReporterType, Subject } from "@/types";

export async function createQuestionIssue(params: {
  questionId: string;
  reporterType: ReporterType;
  reporterId: string;
  userId: string;
  childId?: string;
  subject?: Subject;
  topics?: string[];
  reason: string;
  details?: string;
}) {
  const timestamp = new Date().toISOString();
  const issue: QuestionIssue = {
    questionId: params.questionId,
    issueId: `${timestamp}#${uuidv4()}`,
    reporterType: params.reporterType,
    reporterId: params.reporterId,
    userId: params.userId,
    childId: params.childId,
    subject: params.subject,
    topics: params.topics,
    reason: params.reason,
    details: params.details,
    status: "reported",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await putItem(TABLES.QUESTION_ISSUES, issue);
  return issue;
}
