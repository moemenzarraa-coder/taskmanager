package com.rsi.taskmanager.service;

import com.rsi.taskmanager.dto.TaskRequest;
import com.rsi.taskmanager.model.Task;
import com.rsi.taskmanager.repository.TaskRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class TaskService {

    private final TaskRepository repository;

    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }

    public List<Task> findAll() {
        return repository.findAll();
    }

    public Task findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
    }

    public Task create(TaskRequest request) {
        Task task = new Task(request.title(), request.description());
        task.setDone(request.done());
        return repository.save(task);
    }

    public Task update(Long id, TaskRequest request) {
        Task task = findById(id);
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setDone(request.done());
        return repository.save(task);
    }

    public void delete(Long id) {
        repository.delete(findById(id));
    }
}
