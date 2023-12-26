import { Knex, knex as setupKnex } from 'knex'
import { env } from '../env'

const config: Knex.Config = {
  client: env.DATABASE_CLIENT,
  migrations: {
    extension: 'ts',
    directory: './src/db/migrations',
  },
}

if (env.DATABASE_CLIENT === 'sqlite') {
  config.useNullAsDefault = true
  config.connection = {
    filename: env.DATABASE_URL,
  }
} else {
  config.connection = env.DATABASE_URL
}

const knex = setupKnex(config)

export = { config, knex }
