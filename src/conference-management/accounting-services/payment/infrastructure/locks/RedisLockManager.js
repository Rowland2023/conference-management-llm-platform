import { randomUUID } from "crypto";

export class RedisLockManager {
    /**
     * @param {Object} dependencies
     * @param {import('ioredis').Redis} dependencies.redis
     * @param {Object} [dependencies.logger]
     * @param {string} [dependencies.namespace]
     */
    constructor({
        redis,
        logger = console,
        namespace = "app",
    }) {

        if (!redis) {
            throw new Error(
                "RedisLockManager requires a redis client"
            );
        }

        if (
            typeof redis.safeReleaseLock !== "function" ||
            typeof redis.safeExtendLock !== "function"
        ) {
            throw new Error(
                "Redis client is missing lock commands"
            );
        }


        this.redis = redis;
        this.logger = logger;
        this.namespace = namespace;
    }


    _key(resource) {
        return `${this.namespace}:lock:${resource}`;
    }


    async acquireLock(resource, ttl) {

        if (!resource) {
            throw new Error(
                "Resource name is required"
            );
        }

        if (!ttl || ttl < 1000) {
            throw new Error(
                "TTL must be >= 1000ms"
            );
        }


        const key = this._key(resource);
        const token = randomUUID();


        try {

            const result =
                await this.redis.set(
                    key,
                    token,
                    "NX",
                    "PX",
                    ttl
                );


            if (result !== "OK") {
                return null;
            }


            return {
                resource,
                token,
                ttl,
            };


        } catch (error) {

            this.logger.error(
                {
                    err: error,
                    key,
                    action: "acquire",
                },
                "Lock acquire failed"
            );

            return null;
        }
    }


    async releaseLock(lock) {

        if (!lock?.resource || !lock?.token) {

            this.logger.warn(
                {
                    lock,
                },
                "Invalid lock release request"
            );

            return false;
        }


        const key =
            this._key(lock.resource);


        try {

            const result =
                await this.redis.safeReleaseLock(
                    key,
                    lock.token
                );


            return result === 1;


        } catch (error) {

            this.logger.error(
                {
                    err: error,
                    key,
                    action: "release",
                },
                "Lock release failed"
            );

            return false;
        }
    }


    async extendLock(lock, ttl) {

        if (
            !lock?.resource ||
            !lock?.token ||
            !ttl ||
            ttl < 1000
        ) {

            this.logger.warn(
                {
                    lock,
                    ttl,
                },
                "Invalid lock extension request"
            );

            return false;
        }


        const key =
            this._key(lock.resource);


        try {

            const result =
                await this.redis.safeExtendLock(
                    key,
                    lock.token,
                    ttl
                );


            return result === 1;


        } catch (error) {

            this.logger.error(
                {
                    err: error,
                    key,
                    action: "extend",
                },
                "Lock extend failed"
            );

            return false;
        }
    }
}