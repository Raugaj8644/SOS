import {
  Controller, Get, Delete, Param, UseGuards,
  HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalAdminGuard } from '../../common/guards/global-admin.guard';
import { AreasService } from '../areas/areas.service';

@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, GlobalAdminGuard)
export class AdminController {
  constructor(private readonly areasService: AreasService) {}

  /** GET /api/v1/admin/areas?include_inactive=true */
  @Get('areas')
  listAllAreas(@Query('include_inactive') includeInactive?: string) {
    return this.areasService.findAll(includeInactive === 'true');
  }

  /** DELETE /api/v1/admin/areas/:areaId — force-deactivate any area */
  @Delete('areas/:areaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  forceDeleteArea(@Param('areaId') areaId: string) {
    return this.areasService.forceRemove(areaId);
  }
}
