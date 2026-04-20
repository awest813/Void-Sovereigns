export interface HealthSystemOptions {
  maxHealth: number;
  onDamage?: (current: number, max: number) => void;
  onHeal?: (current: number, max: number) => void;
  onDeath?: () => void;
}

export class HealthSystem {
  private currentHealth: number;
  private maxHealth: number;
  private currentShield: number;
  private maxShield: number;
  private options: HealthSystemOptions;
  
  private lastDamageTime = 0;
  private shieldRegenDelay = 5000; // 5 seconds
  private shieldRegenRate = 10;      // 10 units per second

  constructor(options: HealthSystemOptions) {
    this.options = options;
    this.maxHealth = options.maxHealth;
    this.currentHealth = options.maxHealth;
    this.maxShield = 100;
    this.currentShield = 100;
  }

  takeDamage(amount: number): void {
    if (this.currentHealth <= 0) return;
    this.lastDamageTime = Date.now();
    
    let remainingDamage = amount;
    
    // Shield takes damage first
    if (this.currentShield > 0) {
       const shieldDamage = Math.min(this.currentShield, remainingDamage);
       this.currentShield -= shieldDamage;
       remainingDamage -= shieldDamage;
    }

    if (remainingDamage > 0) {
      this.currentHealth = Math.max(0, this.currentHealth - remainingDamage);
    }

    this.options.onDamage?.(this.currentHealth, this.maxHealth);
    
    if (this.currentHealth <= 0) {
      this.options.onDeath?.();
    }
  }

  public update(deltaSeconds: number): void {
    if (Date.now() - this.lastDamageTime > this.shieldRegenDelay) {
       if (this.currentShield < this.maxShield) {
          this.currentShield = Math.min(this.maxShield, this.currentShield + (this.shieldRegenRate * deltaSeconds));
       }
    }
    // Note: We need a way to tell the HUD about the new shield value
    // We'll add an onShieldUpdate to options or just return it
  }

  getShieldPercent(): number {
    return this.currentShield / this.maxShield;
  }

  heal(amount: number): void {
    if (this.currentHealth <= 0) return;
    
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.options.onHeal?.(this.currentHealth, this.maxHealth);
  }

  getCurrentHealth(): number {
    return this.currentHealth;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  reset(): void {
    this.currentHealth = this.maxHealth;
  }
}
