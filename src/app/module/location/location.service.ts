import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import { join } from 'path';
import { CountryCity, CountryCityDocument } from './entities/country-city.entity';
import { State, StateDocument } from './entities/state.entity';
import {
  GetCitiesByStateQueryDto,
  GetStatesQueryDto,
} from './dto/location-query.dto';

type NormalizedCity = {
  name: string;
  stateCode?: string;
  stateName?: string;
};

type StatePayload = Partial<State> & {
  _id?: unknown;
};

type JsonCity = {
  id?: number;
  name?: string;
};

type JsonState = {
  id?: number;
  name?: string;
  iso2?: string;
  cities?: JsonCity[];
};

type JsonCountry = {
  id?: number;
  name?: string;
  iso2?: string;
  states?: JsonState[];
};

@Injectable()
export class LocationService {
  private stateCityJsonCache: JsonCountry[] | null = null;

  constructor(
    @InjectModel(State.name)
    private readonly stateModel: Model<StateDocument>,
    @InjectModel(CountryCity.name)
    private readonly countryCityModel: Model<CountryCityDocument>,
  ) {}

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildSearchRegex(searchTerm?: string) {
    return searchTerm ? new RegExp(this.escapeRegex(searchTerm), 'i') : null;
  }

  private getStateCityJsonCandidatePaths() {
    return [
      process.env.LOCATION_DATA_FILE,
      join(process.cwd(), 'src', 'app', 'data', 'countries+states+cities.json'),
      join(process.cwd(), 'countries+states+cities.json'),
      join(process.env.USERPROFILE || '', 'Downloads', 'countries+states+cities.json'),
    ].filter((path): path is string => Boolean(path));
  }

  private loadStateCityJsonData() {
    if (this.stateCityJsonCache) {
      return this.stateCityJsonCache;
    }

    for (const filePath of this.getStateCityJsonCandidatePaths()) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedData = JSON.parse(fileContent);

      if (Array.isArray(parsedData)) {
        this.stateCityJsonCache = parsedData as JsonCountry[];
        return this.stateCityJsonCache;
      }
    }

    return null;
  }

  private getCitiesFromJsonDataset(
    state: StatePayload,
    query: GetCitiesByStateQueryDto,
    searchRegex: RegExp | null,
    limit: number,
  ) {
    const dataset = this.loadStateCityJsonData();

    if (!dataset) {
      return null;
    }

    const countryName = query.countryName || state.country_name || 'United States';
    const countryCode = state.country_code;

    const country = dataset.find(
      (item) =>
        item.name?.toLowerCase() === countryName.toLowerCase() ||
        item.iso2?.toLowerCase() === countryCode?.toLowerCase(),
    );

    if (!country?.states?.length) {
      return null;
    }

    const matchedState = country.states.find(
      (item) =>
        item.name?.toLowerCase() === state.name?.toLowerCase() ||
        item.iso2?.toLowerCase() === state.iso2?.toLowerCase() ||
        item.id === state.id,
    );

    if (!matchedState?.cities?.length) {
      return null;
    }

    const cities = matchedState.cities
      .map((city) => city.name?.trim())
      .filter((city): city is string => Boolean(city))
      .filter((city) => !searchRegex || searchRegex.test(city))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit);

    return {
      state: this.mapStateResponse(state),
      dataSource: 'json-file',
      cities,
    };
  }

  private async findStateOrThrow(stateIdentifier: string) {
    const numericStateId = Number(stateIdentifier);
    const isNumericStateId = Number.isInteger(numericStateId);
    const isMongoId = Types.ObjectId.isValid(stateIdentifier);

    const state = await this.stateModel
      .findOne({
        $or: [
          ...(isMongoId ? [{ _id: new Types.ObjectId(stateIdentifier) }] : []),
          ...(isNumericStateId ? [{ id: numericStateId }] : []),
        ],
      })
      .lean();

    if (!state) {
      throw new HttpException('State not found', 404);
    }

    return state;
  }

  private normalizeCityEntry(entry: unknown): NormalizedCity | null {
    if (typeof entry === 'string') {
      return {
        name: entry.trim(),
      };
    }

    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const cityRecord = entry as Record<string, unknown>;
    const rawName = cityRecord.name ?? cityRecord.city;

    if (typeof rawName !== 'string' || !rawName.trim()) {
      return null;
    }

    return {
      name: rawName.trim(),
      stateCode:
        typeof cityRecord.state_code === 'string'
          ? cityRecord.state_code.trim()
          : typeof cityRecord.stateCode === 'string'
            ? cityRecord.stateCode.trim()
            : undefined,
      stateName:
        typeof cityRecord.state_name === 'string'
          ? cityRecord.state_name.trim()
          : typeof cityRecord.stateName === 'string'
            ? cityRecord.stateName.trim()
            : undefined,
    };
  }

  private mapStateResponse(state: StatePayload) {
    return {
      id: state.id,
      mongoId: state._id ? String(state._id) : undefined,
      name: state.name,
      iso2: state.iso2,
      countryCode: state.country_code,
      countryName: state.country_name,
    };
  }

  async getStates(query: GetStatesQueryDto) {
    const searchRegex = this.buildSearchRegex(query.searchTerm);
    const whereConditions: Record<string, unknown> = {};

    if (query.countryCode) {
      whereConditions.country_code = query.countryCode.toUpperCase();
    }

    if (searchRegex) {
      whereConditions.$or = [
        { name: { $regex: searchRegex } },
        { iso2: { $regex: searchRegex } },
      ];
    }

    const states = await this.stateModel
      .find(whereConditions)
      .sort({ name: 1 })
      .lean();

    return states.map((state) => this.mapStateResponse(state));
  }

  async getCitiesByState(
    stateIdentifier: string,
    query: GetCitiesByStateQueryDto,
  ) {
    const state = await this.findStateOrThrow(stateIdentifier);

    const searchRegex = this.buildSearchRegex(query.searchTerm);
    const limit = query.limit ?? 500;

    if (Array.isArray(state.cities) && state.cities.length > 0) {
      const filteredCities = state.cities
        .map((city) => city.trim())
        .filter((city) => city && (!searchRegex || searchRegex.test(city)))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, limit);

      return {
        state: this.mapStateResponse(state),
        dataSource: 'state',
        cities: filteredCities,
      };
    }

    const jsonDatasetCities = this.getCitiesFromJsonDataset(
      state,
      query,
      searchRegex,
      limit,
    );

    if (jsonDatasetCities) {
      return jsonDatasetCities;
    }

    const countryName = query.countryName || state.country_name || 'United States';
    const countryCityDocument = await this.countryCityModel
      .findOne({ name: countryName })
      .lean();

    if (!countryCityDocument) {
      throw new HttpException('Country city data not found', 404);
    }

    const normalizedCities = (countryCityDocument.cities ?? [])
      .map((entry) => this.normalizeCityEntry(entry))
      .filter((entry): entry is NormalizedCity => Boolean(entry));

    const hasStateLinkedCities = normalizedCities.some(
      (city) => city.stateCode || city.stateName,
    );

    if (!hasStateLinkedCities) {
      throw new HttpException(
        'Current Mongo city dataset is not linked to states, and no usable state-city JSON fallback was found.',
        409,
      );
    }

    const cities = normalizedCities
      .filter(
        (city) =>
          city.stateCode?.toLowerCase() === state.iso2?.toLowerCase() ||
          city.stateName?.toLowerCase() === state.name.toLowerCase(),
      )
      .map((city) => city.name)
      .filter((city, index, collection) => collection.indexOf(city) === index)
      .filter((city) => !searchRegex || searchRegex.test(city))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit);

    return {
      state: this.mapStateResponse(state),
      dataSource: 'country_cities',
      cities,
    };
  }
}
