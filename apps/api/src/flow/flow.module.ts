import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { FlowRouter } from "./flow.router";
import { FlowService } from "./flow.service";

@Module({
	imports: [TrpcModule],
	providers: [FlowService, FlowRouter],
	exports: [FlowService],
})
export class FlowModule {}
