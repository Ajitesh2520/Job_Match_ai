-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "JobSkillType" AS ENUM ('MUST_HAVE', 'NICE_TO_HAVE');

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "expectedSalary" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "skill" TEXT NOT NULL,

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "minYearsExperience" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "salaryMin" INTEGER NOT NULL,
    "salaryMax" INTEGER NOT NULL,
    "remoteAllowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "skill" TEXT NOT NULL,
    "type" "JobSkillType" NOT NULL,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidates_location_idx" ON "candidates"("location");

-- CreateIndex
CREATE INDEX "candidate_skills_skill_idx" ON "candidate_skills"("skill");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_skills_candidateId_skill_key" ON "candidate_skills"("candidateId", "skill");

-- CreateIndex
CREATE INDEX "jobs_location_idx" ON "jobs"("location");

-- CreateIndex
CREATE INDEX "job_skills_skill_idx" ON "job_skills"("skill");

-- CreateIndex
CREATE INDEX "job_skills_type_idx" ON "job_skills"("type");

-- CreateIndex
CREATE UNIQUE INDEX "job_skills_jobId_skill_key" ON "job_skills"("jobId", "skill");

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

