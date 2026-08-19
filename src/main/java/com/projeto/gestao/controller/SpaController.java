package com.projeto.gestao.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping({"/login", "/dashboard"})
    public String encaminharParaFrontend() {
        return "forward:/index.html";
    }
}
