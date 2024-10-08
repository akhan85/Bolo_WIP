import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';

dotenv.config({
    path: '.env.local',
})

export default defineConfig ({
    dialect: "postgresql",
    schema: "db/schema.ts",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    }
});