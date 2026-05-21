CREATE INDEX "ai_usage_logs_user_feature_status_created_idx" ON "ai_usage_logs" USING btree ("user_id","feature","status","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_user_created_idx" ON "chat_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "daily_plans_weekly_date_idx" ON "daily_plans" USING btree ("weekly_plan_id","date");--> statement-breakpoint
CREATE INDEX "exercises_daily_plan_sort_idx" ON "exercises" USING btree ("daily_plan_id","sort_order");--> statement-breakpoint
CREATE INDEX "invoices_user_issued_idx" ON "invoices" USING btree ("user_id","issued_at");--> statement-breakpoint
CREATE INDEX "meals_daily_plan_sort_idx" ON "meals" USING btree ("daily_plan_id","sort_order");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "progress_logs_user_date_idx" ON "progress_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX "shares_shared_with_idx" ON "shares" USING btree ("shared_with_user_id");--> statement-breakpoint
CREATE INDEX "shares_weekly_plan_idx" ON "shares" USING btree ("weekly_plan_id");--> statement-breakpoint
CREATE INDEX "weekly_plans_user_start_idx" ON "weekly_plans" USING btree ("user_id","start_date");