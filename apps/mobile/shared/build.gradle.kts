import groovy.json.JsonOutput

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.android.kmp.library)
}

val sharedDataDir = rootProject.layout.projectDirectory.dir("../../shared-data")

// shared-data の JSON を、Kotlin の文字列の定数にする（Web と同じファイルを正本にし、どのターゲットでもファイルを読まずに使う）。
fun registerJsonConstants(taskName: String, sourceDir: Directory, constants: Map<String, String>, sourceSet: String) =
    tasks.register(taskName) {
        val files = constants.mapValues { (_, path) -> sourceDir.file(path) }
        val outputDir = layout.buildDirectory.dir("generated/sharedData/$sourceSet")
        inputs.files(files.values)
        outputs.dir(outputDir)

        doLast {
            val body = files.entries.joinToString("\n") { (name, file) ->
                val literal = JsonOutput.toJson(file.asFile.readText()).replace("$", "\\$")
                "internal const val $name: String = $literal\n"
            }
            val target = outputDir.get().dir("app/recipion/shared/config").asFile
            target.mkdirs()
            target.resolve("${taskName.removePrefix("generate")}.kt")
                .writeText("package app.recipion.shared.config\n\n$body")
        }
    }

val generateSharedData = registerJsonConstants(
    "generateSharedDataJson",
    sharedDataDir,
    mapOf("AUTH_JSON" to "auth.json"),
    "commonMain",
)

val generateSharedTestData = registerJsonConstants(
    "generateTestCasesJson",
    sharedDataDir,
    mapOf(
        "EMAIL_ADDRESS_CASES_JSON" to "test-cases/email-address.json",
        "OTP_DIGITS_CASES_JSON" to "test-cases/otp-digits.json",
        "SEND_CODE_REQUEST_HASH_CASES_JSON" to "test-cases/send-code-request-hash.json",
    ),
    "commonTest",
)

kotlin {
    android {
        namespace = "app.recipion.shared"
        compileSdk = 37
        minSdk = 26

        withHostTest {}
    }

    jvm()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain {
            kotlin.srcDir(generateSharedData)

            dependencies {
                implementation(libs.coroutines.core)
                implementation(libs.serialization.json)
                implementation(libs.ktor.client.core)
                implementation(libs.ktor.client.content.negotiation)
                implementation(libs.ktor.serialization.json)
                api(libs.lifecycle.viewmodel)
            }
        }
        commonTest {
            kotlin.srcDir(generateSharedTestData)
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.ktor.client.mock)
            implementation(libs.coroutines.test)
        }
    }
}
