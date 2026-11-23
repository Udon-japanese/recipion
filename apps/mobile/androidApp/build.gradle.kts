plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "app.recipion.android"
    compileSdk = 37

    defaultConfig {
        applicationId = "app.recipion.android"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        debug {
            // エミュレーターから `adb reverse tcp:3000 tcp:3000` で、Mac の nr dev につなぐ。
            buildConfigField("String", "API_BASE_URL", "\"http://localhost:3000\"")
            buildConfigField("boolean", "DEV_SERVER", "true")
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"https://recipion.app\"")
            buildConfigField("boolean", "DEV_SERVER", "false")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(project(":shared"))
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.material3)
    implementation(libs.compose.ui)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.datastore.preferences)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.coroutines.android)
}
