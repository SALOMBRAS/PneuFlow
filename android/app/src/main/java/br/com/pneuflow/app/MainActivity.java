package br.com.pneuflow.app;

import android.graphics.Color;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setBackgroundColor(Color.rgb(10, 11, 16));
    }
}
