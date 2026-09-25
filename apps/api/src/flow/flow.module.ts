import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { FlowRouter } from "./flow.router";
import { FlowService } from "./flow.service";
import { FlowPortalRouter } from "./flow-portal.router";
import { FlowPortalService } from "./flow-portal.service";
import { FlowUploadController } from "./flow-upload.controller";

@Module({
	imports: [TrpcModule],
	controllers: [FlowUploadController],
	providers: [FlowService, FlowRouter, FlowPortalService, FlowPortalRouter],
	exports: [FlowService, FlowPortalService],
})
export class FlowModule {}
