package app.recipion.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val application = application as RecipionApplication

        setContent {
            MaterialTheme {
                Surface {
                    App(application.api, application.shoppingSyncer)
                }
            }
        }
    }
}
