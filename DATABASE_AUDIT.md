# 🔍 DATABASE INTEGRITY AUDIT

## 📊 Current Database Schema

### Core Tables
- **companies** - Firmy
- **users** - Uživatelé  
- **trainings** - Školení
- **lessons** - Lekce
- **tests** - Testy
- **user_trainings** - Propojení uživatel-školení
- **attempts** - Pokusy o test (legacy)
- **test_sessions** - Test sessions (legacy)
- **answers** - Odpovědi na otázky (legacy)

## ❌ IDENTIFIKOVANÉ PROBLÉMY

### 1. 🔗 **Foreign Key Inconsistencies**

#### Company.contactPersonId
```javascript
// PROBLÉM: Cirkulární reference
Company.contactPersonId -> User.id
User.companyId -> Company.id
```
**Řešení:** Odstranit `contactPersonId` z Company modelu a používat role-based logic.

#### Test Model - Mixed References
```javascript
// PROBLÉM: Nekonzistentní reference style
lessonId: {
  references: {
    model: 'lessons', // String reference
    key: 'id'
  }
},
trainingId: {
  references: {
    model: Training, // Model reference
    key: 'id'
  }
}
```
**Řešení:** Sjednotit na model references.

### 2. 📝 **Nullable Fields Issues**

#### User Model
```javascript
// PROBLÉM: Kritická pole jsou nullable
email: {
  allowNull: true  // Dočasně nullable pro migraci
},
password: {
  allowNull: true  // Dočasně nullable pro migraci
}
```
**Řešení:** Po dokončení migrace nastavit `allowNull: false`.

### 3. 🔄 **Duplicate/Legacy Models**

#### Overlapping Functionality
- **Test** vs **TestSession** - podobná funkcionalita
- **Attempt** vs **UserTraining** - překrývající se tracking
- **Answer** - používá se pouze s legacy Attempt

**Řešení:** Konsolidovat na nové modely, odstranit legacy.

### 4. 🚫 **Disabled Associations**

```javascript
// PROBLÉM: Vypnuté associations
// TestResult associations - DISABLED until Users table exists
// TestResponse associations - TEMPORARILY DISABLED
```
**Řešení:** Aktivovat nebo úplně odstranit.

### 5. 📐 **Missing Constraints**

#### Unique Constraints
```javascript
// PROBLÉM: Chybí composite unique constraints
UserTraining: {
  // Mělo by být unique(userId, trainingId)
}
```

#### Check Constraints
```javascript
// PROBLÉM: Chybí validace rozsahů
progress: {
  type: DataTypes.INTEGER,
  defaultValue: 0  // Mělo by být 0-100
}
```

## ✅ DOPORUČENÉ OPRAVY

### 1. **Immediate Fixes**

#### Fix Foreign Key References
```javascript
// Sjednotit reference style
lessonId: {
  type: DataTypes.INTEGER,
  references: {
    model: Lesson,  // Použít model místo stringu
    key: 'id'
  },
  allowNull: false
}
```

#### Remove Circular Reference
```javascript
// Odstranit contactPersonId z Company
// Použít User.role === 'contact_person' && User.companyId
```

#### Add Missing Constraints
```javascript
// UserTraining - prevent duplicates
{
  indexes: [
    {
      unique: true,
      fields: ['userId', 'trainingId']
    }
  ]
}
```

### 2. **Schema Cleanup**

#### Remove Legacy Models
- **Attempt** → Nahradit TestSession nebo odstranit
- **Answer** → Integrovat do TestSession.answers JSON
- **TestResponse** → Aktivovat nebo odstranit

#### Consolidate Similar Models
- **Test** + **TestSession** → Unified Test model
- **UserTraining** jako hlavní tracking mechanism

### 3. **Data Validation**

#### Add Check Constraints
```javascript
progress: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
  validate: {
    min: 0,
    max: 100
  }
}
```

#### Enforce Required Fields
```javascript
// Po migraci
email: {
  type: DataTypes.STRING,
  unique: true,
  allowNull: false  // Změnit z true
},
password: {
  type: DataTypes.STRING,
  allowNull: false  // Změnit z true
}
```

## 🛠️ MIGRATION PLAN

### Phase 1: Critical Fixes
1. ✅ Fix role ENUM (already done)
2. 🔧 Remove Company.contactPersonId circular reference
3. 🔧 Standardize foreign key references
4. 🔧 Add unique constraints

### Phase 2: Schema Cleanup
1. 🧹 Remove or activate disabled models
2. 🧹 Consolidate legacy models
3. 🧹 Clean up unused fields

### Phase 3: Data Validation
1. 📝 Add check constraints
2. 📝 Enforce required fields
3. 📝 Add proper indexes

## 🔍 CURRENT STATUS

### ✅ Working Correctly
- User authentication and registration
- Basic CRUD operations
- Role-based access control
- Training/Lesson/Test relationships

### ⚠️ Needs Attention
- Company contact person management
- Test result tracking consistency
- Legacy model cleanup
- Missing data validation

### 🚨 Critical Issues
- Circular foreign key reference
- Nullable critical fields
- Inconsistent reference styles 