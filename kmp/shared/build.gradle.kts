plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kmp.library)
}

kotlin {
    android {
        namespace = "app.recipion.shared"
        compileSdk = 37
        minSdk = 26
    }

    jvm()

    js {
        outputModuleName = "recipion-shared"
        browser()
        nodejs()
        binaries.library()
        useEsModules()
        generateTypeScriptDefinitions()
    }

    sourceSets {
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
        jvmTest.dependencies {
            implementation(libs.serialization.json)
        }
    }
}
