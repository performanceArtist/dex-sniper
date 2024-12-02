import {
  PoolEntity,
  SubscriptionEntity,
  TokenEntity,
  UserEntity,
} from '../src/modules/repository/model';
import { DataSource } from 'typeorm';
import { getPools, UniswapPoolData } from './getPools';
import { parseEnv } from '../src/modules/config/config.service';

const appConfig = parseEnv();

const entities = [UserEntity, TokenEntity, SubscriptionEntity, PoolEntity];

export const dataSource = new DataSource({
  type: 'postgres',
  host: appConfig.DB_HOST,
  port: appConfig.DB_PORT,
  username: appConfig.DB_USERNAME,
  password: appConfig.DB_PASSWORD,
  database: appConfig.DB_NAME,
  entities,
  synchronize: true,
});

const populateAll = async () => {
  await dataSource.initialize();

  const uniswap = await getPools(appConfig.GRAPH_API_KEY);
  if (!uniswap) throw 'No pools found';

  await Promise.all(uniswap.map(populate));
};

const populate = async (uniswap: UniswapPoolData) => {
  try {
    console.log('pools', uniswap);

    const tokenEntities = Object.entries(uniswap.tokens).reduce(
      (acc, [key, value]) => {
        const entity = new TokenEntity();
        entity.address = value.id;
        entity.decimals = Number(value.decimals);
        entity.symbol = value.symbol;
        entity.chainId = uniswap.chainId;
        return { ...acc, [key]: entity };
      },
      {} as Record<string, TokenEntity>,
    );
    const poolEntities = uniswap.pools.map(({ id, token0, token1 }) => {
      const entity = new PoolEntity();
      entity.address = id;
      entity.base = tokenEntities[token1.id];
      entity.quote = tokenEntities[token0.id];
      entity.chainId = uniswap.chainId;
      return entity;
    });

    const poolRepo = dataSource.getRepository(PoolEntity);
    const tokenRepo = dataSource.getRepository(TokenEntity);
    await tokenRepo.save(Object.values(tokenEntities));
    await poolRepo.save(poolEntities);
  } catch (e) {
    console.error(e);
  }
};

populateAll();
