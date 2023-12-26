import { FastifyReply, FastifyRequest } from "fastify";
import { knex } from "../db";

export async function checkUserExists(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionId = request.cookies.sessionId;

  if (!sessionId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const userFound = await knex("users")
    .where({ session_id: sessionId })
    .first();

  if (!userFound) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  request.user = userFound;
}
