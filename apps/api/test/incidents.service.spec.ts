import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { IncidentsService } from '../src/modules/incidents/incidents.service';
import { Incident } from '../src/modules/incidents/entities/incident.entity';
import { Area } from '../src/modules/areas/entities/area.entity';
import { AreaMembership } from '../src/modules/areas/entities/area-membership.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const MOCK_AREA_ID = 'area-uuid-1';
const MOCK_USER_ID = 'user-uuid-1';

const mockIncidentRepo = {
  manager: {
    query: jest.fn(),
  },
  create: jest.fn(),
  save:   jest.fn(),
  findOne: jest.fn(),
  find:   jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
};

describe('IncidentsService', () => {
  let service: IncidentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: getRepositoryToken(Incident),        useValue: mockIncidentRepo },
        { provide: getRepositoryToken(Area),            useValue: {} },
        { provide: getRepositoryToken(AreaMembership),  useValue: {} },
        { provide: getQueueToken('incident'),           useValue: mockQueue },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('validates that location is inside Area boundary', async () => {
      // Simulate ST_Contains returning false (no row returned)
      mockIncidentRepo.manager.query.mockResolvedValue([{ within: false }]);

      await expect(
        service.create(MOCK_AREA_ID, MOCK_USER_ID, {
          type:        'fire',
          latitude:    99.9999,  // outside any polygon
          longitude:   99.9999,
          description: 'Test fire',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enqueues BullMQ job after saving (non-blocking)', async () => {
      mockIncidentRepo.manager.query.mockResolvedValue([{ within: true }]);
      mockIncidentRepo.create.mockReturnValue({ id: 'incident-1' });
      mockIncidentRepo.save.mockResolvedValue({ id: 'incident-1', type: 'fire' });

      await service.create(MOCK_AREA_ID, MOCK_USER_ID, {
        type:      'fire',
        latitude:  13.7563,
        longitude: 100.5018,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'incident.created',
        expect.objectContaining({ incidentId: 'incident-1' }),
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  describe('close', () => {
    it('rejects non-creator from closing', async () => {
      mockIncidentRepo.findOne.mockResolvedValue({
        id: 'incident-1',
        created_by: 'other-user',
        status: 'active',
      });

      await expect(
        service.close(MOCK_AREA_ID, 'incident-1', MOCK_USER_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows creator to close', async () => {
      const incident = { id: 'incident-1', created_by: MOCK_USER_ID, status: 'active' };
      mockIncidentRepo.findOne.mockResolvedValue(incident);
      mockIncidentRepo.save.mockResolvedValue({ ...incident, status: 'resolved' });

      const result = await service.close(MOCK_AREA_ID, 'incident-1', MOCK_USER_ID, {});
      expect(result.status).toBe('resolved');
    });
  });
});
