// ============================================================================
// PRIORITIZED EXPERIENCE REPLAY BUFFER
// Stores and samples experiences based on their learning value
// ============================================================================

export interface Experience {
    id: string;
    state: string;
    action: string;
    reward: number;
    nextState: string;
    isTerminal: boolean;
    priority: number;
    timestamp: number;
}

export class PrioritizedReplayBuffer {
    private buffer: Experience[] = [];
    private maxSize: number;
    private nextId = 0;

    constructor(maxSize: number = 2000) {
        this.maxSize = maxSize;
    }

    /**
     * Add experience with priority
     */
    public add(
        state: string,
        action: string,
        reward: number,
        nextState: string,
        isTerminal: boolean,
        tdError: number = 0
    ): void {
        // Calculate priority
        const priority = this.calculatePriority(reward, tdError, isTerminal);

        const experience: Experience = {
            id: `exp_${this.nextId++}`,
            state,
            action,
            reward,
            nextState,
            isTerminal,
            priority,
            timestamp: Date.now()
        };

        this.buffer.push(experience);

        // Remove oldest if buffer is full
        if (this.buffer.length > this.maxSize) {
            // Remove lowest priority experience
            this.buffer.sort((a, b) => a.priority - b.priority);
            this.buffer.shift();
        }
    }

    /**
     * Calculate priority for an experience
     */
    private calculatePriority(reward: number, tdError: number, isTerminal: boolean): number {
        let priority = Math.abs(tdError) + 1; // Base priority from TD error

        // Bonus for valuable experiences
        if (reward > 500) {
            priority += 500; // High reward episode
        }

        if (reward > 200 && reward <= 500) {
            priority += 100; // Good move
        }

        if (isTerminal && reward > 1000) {
            priority += 1000; // Victory!
        }

        if (reward < -500) {
            priority += 50; // Learn from mistakes too
        }

        return priority;
    }

    /**
     * Sample batch of experiences using prioritized sampling
     * 80% high priority, 20% random
     */
    public sample(batchSize: number): Experience[] {
        if (this.buffer.length === 0) return [];

        const actualBatchSize = Math.min(batchSize, this.buffer.length);
        const sampled: Experience[] = [];

        // Sort by priority
        const sorted = [...this.buffer].sort((a, b) => b.priority - a.priority);

        const numHighPriority = Math.floor(actualBatchSize * 0.8);
        const numRandom = actualBatchSize - numHighPriority;

        // Sample top priority
        for (let i = 0; i < numHighPriority && i < sorted.length; i++) {
            sampled.push(sorted[i]);
        }

        // Sample random for diversity
        for (let i = 0; i < numRandom; i++) {
            const randomIdx = Math.floor(Math.random() * this.buffer.length);
            sampled.push(this.buffer[randomIdx]);
        }

        return sampled;
    }

    /**
     * Update priority of existing experience
     */
    public updatePriority(id: string, newPriority: number): void {
        const exp = this.buffer.find(e => e.id === id);
        if (exp) {
            exp.priority = newPriority;
        }
    }

    /**
     * Get buffer statistics
     */
    public getStats(): {
        size: number;
        avgPriority: number;
        maxPriority: number;
        minPriority: number;
    } {
        if (this.buffer.length === 0) {
            return { size: 0, avgPriority: 0, maxPriority: 0, minPriority: 0 };
        }

        const priorities = this.buffer.map(e => e.priority);
        return {
            size: this.buffer.length,
            avgPriority: priorities.reduce((a, b) => a + b, 0) / priorities.length,
            maxPriority: Math.max(...priorities),
            minPriority: Math.min(...priorities)
        };
    }

    /**
     * Clear buffer
     */
    public clear(): void {
        this.buffer = [];
        this.nextId = 0;
    }

    /**
     * Get top N highest priority experiences
     */
    public getTopExperiences(n: number): Experience[] {
        return [...this.buffer]
            .sort((a, b) => b.priority - a.priority)
            .slice(0, n);
    }

    /**
     * Remove experiences older than timestamp
     */
    public removeOld(maxAge: number): number {
        const cutoff = Date.now() - maxAge;
        const before = this.buffer.length;
        this.buffer = this.buffer.filter(e => e.timestamp > cutoff);
        return before - this.buffer.length;
    }
}
