import { getSession } from "@/lib/auth";
import { getKidSession } from "@/lib/kid-session";

export interface ParentActorSession {
  kind: "parent";
  userId: string;
  reporterType: "parent";
  reporterId: string;
}

export interface KidActorSession {
  kind: "kid";
  userId: string;
  childId: string;
  reporterType: "child";
  reporterId: string;
}

export type ActorSession = ParentActorSession | KidActorSession;

export async function getActorSession(): Promise<ActorSession | null> {
  const parentSession = await getSession();
  if (parentSession?.user?.id) {
    return {
      kind: "parent",
      userId: parentSession.user.id,
      reporterType: "parent",
      reporterId: parentSession.user.id,
    };
  }

  const kidSession = await getKidSession();
  if (!kidSession) {
    return null;
  }

  return {
    kind: "kid",
    userId: kidSession.userId,
    childId: kidSession.childId,
    reporterType: "child",
    reporterId: kidSession.childId,
  };
}

export function actorCanAccessChild(actor: ActorSession, childId: string) {
  return actor.kind === "parent" || actor.childId === childId;
}
