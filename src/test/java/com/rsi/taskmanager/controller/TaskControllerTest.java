package com.rsi.taskmanager.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rsi.taskmanager.model.Task;
import com.rsi.taskmanager.service.TaskNotFoundException;
import com.rsi.taskmanager.service.TaskService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private TaskService service;

    @Test
    void listReturnsTasks() throws Exception {
        when(service.findAll()).thenReturn(List.of(new Task("A", "desc")));

        mvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("A"));
    }

    @Test
    void createReturns201() throws Exception {
        when(service.create(any())).thenReturn(new Task("A", null));

        mvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"A\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("A"));
    }

    @Test
    void createRejectsBlankTitle() throws Exception {
        mvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateReturnsUpdatedTask() throws Exception {
        when(service.update(eq(1L), any())).thenReturn(new Task("B", null));

        mvc.perform(put("/api/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"B\",\"done\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("B"));
    }

    @Test
    void getMissingTaskReturns404() throws Exception {
        when(service.findById(9L)).thenThrow(new TaskNotFoundException(9L));

        mvc.perform(get("/api/tasks/9"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteReturns204() throws Exception {
        mvc.perform(delete("/api/tasks/1"))
                .andExpect(status().isNoContent());

        verify(service).delete(1L);
    }
}
