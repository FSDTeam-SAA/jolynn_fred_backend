import { HttpException } from '@nestjs/common';
import { LocationService } from './location.service';

describe('LocationService referral validation', () => {
  let service: LocationService;

  beforeEach(() => {
    service = new LocationService({} as any, {} as any);
    jest.spyOn(service, 'getStates').mockResolvedValue([
      {
        id: 1,
        mongoId: '6871aa22bb33cc44dd55ee66',
        name: 'Texas',
        iso2: 'TX',
        countryCode: 'US',
        countryName: 'United States',
      },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns canonical state and city values for a valid selection', async () => {
    jest.spyOn(service, 'getCitiesByState').mockResolvedValue({
      state: { name: 'Texas' },
      dataSource: 'country-state-city',
      cities: ['Austin'],
    } as any);

    await expect(
      service.validateStateAndCity(' texas ', ' Austin '),
    ).resolves.toEqual({ state: 'Texas', city: 'Austin' });
  });

  it('rejects a city that is not present in an available state dataset', async () => {
    jest.spyOn(service, 'getCitiesByState').mockResolvedValue({
      state: { name: 'Texas' },
      dataSource: 'country-state-city',
      cities: [],
    } as any);

    await expect(
      service.validateStateAndCity('Texas', 'Not A Texas City'),
    ).rejects.toMatchObject<HttpException>({ status: 400 });
  });

  it('rejects an unknown state', async () => {
    jest.spyOn(service, 'getStates').mockResolvedValue([]);

    await expect(
      service.validateStateAndCity('Unknown State', 'Unknown City'),
    ).rejects.toMatchObject<HttpException>({ status: 400 });
  });
});
