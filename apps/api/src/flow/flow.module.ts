import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { FlowRouter } from "./flow.router";
import { FlowService } from "./flow.service";
import { FlowUploadController } from "./flow-upload.controller";

@Module({
	imports: [TrpcModule],
	controllers: [FlowUploadController],
	providers: [FlowService, FlowRouter],
	exports: [FlowService],
})
export class FlowModule {}
