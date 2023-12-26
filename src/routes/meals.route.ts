/* eslint-disable camelcase */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { checkUserExists } from '../middlewares/checkUserExists'
import { knex } from '../db'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [checkUserExists] }, async (request, reply) => {
    const mealSchema = z.object({
      name: z.string(),
      description: z.string(),
      isOnDiet: z.boolean(),
      date: z.coerce.date(),
    })

    const { name, description, isOnDiet, date } = mealSchema.parse(request.body)

    await knex('meals').insert({
      id: randomUUID(),
      user_id: request.user?.id,
      name,
      description,
      is_on_diet: isOnDiet,
      date: date.getTime(),
    })

    return reply.status(201).send()
  })

  app.get('/', { preHandler: [checkUserExists] }, async (request, reply) => {
    const meals = await knex('meals')
      .where({ user_id: request.user?.id })
      .orderBy('date', 'desc')

    return reply.send({ meals })
  })

  app.get(
    '/:meal_id',
    { preHandler: [checkUserExists] },
    async (request, reply) => {
      const paramsSchema = z.object({ meal_id: z.string().uuid() })

      const { meal_id } = paramsSchema.parse(request.params)

      const meal = await knex('meals').where({ id: meal_id }).first()

      if (!meal) {
        return reply
          .status(404)
          .send({ error: `Meal ID [${meal_id}] not found` })
      }

      return reply.send({ meal })
    },
  )

  app.put(
    '/:meal_id',
    { preHandler: [checkUserExists] },
    async (request, reply) => {
      const paramsSchema = z.object({ meal_id: z.string().uuid() })
      const { meal_id } = paramsSchema.parse(request.params)

      const updateMealSchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date(),
      })

      const { name, description, isOnDiet, date } = updateMealSchema.parse(
        request.body,
      )

      const meal = await knex('meals').where({ id: meal_id }).first()

      if (!meal) {
        return reply
          .status(404)
          .send({ error: `Meal ID [${meal_id}] not found` })
      }

      await knex('meals').where({ id: meal_id }).update({
        name,
        description,
        is_on_diet: isOnDiet,
        date: date.getTime(),
      })

      return reply.status(204).send()
    },
  )

  app.delete(
    '/:meal_id',
    { preHandler: [checkUserExists] },
    async (request, reply) => {
      const paramsSchema = z.object({ meal_id: z.string().uuid() })

      const { meal_id } = paramsSchema.parse(request.params)

      const meal = await knex('meals').where({ id: meal_id }).first()

      if (!meal) {
        return reply
          .status(404)
          .send({ error: `Meal ID [${meal_id}] not found` })
      }

      await knex('meals').where({ id: meal_id }).delete()

      return reply.status(204).send()
    },
  )

  app.get(
    '/metrics',
    { preHandler: [checkUserExists] },
    async (request, reply) => {
      const totalMealsOnDiet = await knex('meals')
        .where({ user_id: request.user?.id, is_on_diet: true })
        .count('id', { as: 'total' })
        .first()

      const totalMealsOffDiet = await knex('meals')
        .where({ user_id: request.user?.id, is_on_diet: false })
        .count('id', { as: 'total' })
        .first()

      const totalMeals = await knex('meals')
        .where({ user_id: request.user?.id })
        .orderBy('date', 'desc')

      const { bestOnDietSequence } = totalMeals.reduce(
        (acc, meal) => {
          if (meal.is_on_diet) {
            acc.currentSequence += 1
          } else {
            acc.currentSequence = 0
          }

          if (acc.currentSequence > acc.bestOnDietSequence) {
            acc.bestOnDietSequence = acc.currentSequence
          }

          return acc
        },
        { bestOnDietSequence: 0, currentSequence: 0 },
      )

      return reply.send({
        totalMeals: totalMeals.length,
        totalMealsOnDiet: totalMealsOnDiet?.total,
        totalMealsOffDiet: totalMealsOffDiet?.total,
        bestOnDietSequence,
      })
    },
  )
}
